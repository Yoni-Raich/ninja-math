// Builds the voice-over library with Gemini TTS (Google AI Studio "Generate speech").
//
//   node scripts/gen-voice.mjs              -> generate every clip that has no raw file yet, then process all
//   node scripts/gen-voice.mjs n_3 praise_1 -> (re)generate just these ids
//   node scripts/gen-voice.mjs --process    -> only re-trim/encode the existing raw clips
//   node scripts/gen-voice.mjs --verify     -> transcribe every clip back with Gemini and flag mismatches
//
// Needs GEMINI_API_KEY. Spec: content/voice/lines.json (+ names read from content/specials|worlds|enemies|fighters|weapons).
// Raw WAVs go to content/voice/raw/<id>.wav (git-ignored); game-ready Opus files to public/voice/<id>.ogg,
// plus public/voice/manifest.json (groups with their variant counts).
import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const KEY = process.env.GEMINI_API_KEY;
const FFMPEG = process.env.FFMPEG_BIN || 'ffmpeg';
const CONCURRENCY = Number(process.env.VOICE_JOBS || 4);
const args = process.argv.slice(2);
const onlyProcess = args.includes('--process');
const verify = args.includes('--verify');
const ids = args.filter((a) => !a.startsWith('--'));

const spec = JSON.parse(readFileSync('content/voice/lines.json', 'utf8'));
const MODEL = process.env.TTS_MODEL || spec.model;
mkdirSync('content/voice/raw', { recursive: true });
mkdirSync('public/voice', { recursive: true });

// ---------- clip list ----------
const clips = [];
const groupSizes = {};
const add = (id, voice, text, style, model) => clips.push({ id, voice, text, style: style || spec.voices[voice].style, model });

for (const [g, def] of Object.entries(spec.groups)) {
  const style = def.style;
  if (Array.isArray(def.lines)) {
    const start = def.start ?? 1;
    def.lines.forEach((t, i) => add(`${g}_${start + i}`, def.voice, t, style, def.model));
    groupSizes[g] = { start, count: def.lines.length };
  } else {
    for (const [id, t] of Object.entries(def.lines)) add(id, def.voice, t, style, def.model);
  }
}

const readJson = (dir) => (existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(`${dir}/${f}`, 'utf8'))) : []);
const fill = (tpl, o) => tpl.replace(/\{(\w+)\}/g, (_, k) => o[k]);
const dyn = (kind, dir, prefix, filter = () => true) => {
  const d = spec.dynamic[kind];
  for (const o of readJson(dir).filter(filter)) add(prefix + o.id, d.voice, fill(d.text, o), d.style);
};
dyn('special', 'content/specials', 'sp_');
dyn('world', 'content/worlds', 'world_');
dyn('boss', 'content/enemies', 'foe_', (e) => e.type === 'boss');
dyn('fighter', 'content/fighters', 'fighter_');
dyn('weapon', 'content/weapons', 'weapon_');

const dup = clips.map((c) => c.id).filter((id, i, a) => a.indexOf(id) !== i);
if (dup.length) throw new Error('duplicate clip ids: ' + dup.join(', '));

// ---------- Gemini TTS ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The free tier allows only ~10 requests per model per day, so lines are read in batches: one request
// reads several lines separated by pauses and the audio is cut apart on the silences.
const BATCH = Number(process.env.VOICE_BATCH || 16);
const dead = new Set(); // models whose daily quota is used up

// Native-audio models only speak through the Live (websocket) API, which has its own, separate quota.
function ttsLive(model, voiceName, style, lines) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${KEY}`);
    const chunks = [];
    const timer = setTimeout(() => { ws.close(); reject(new Error('live timeout')); }, 90000);
    ws.onopen = () => ws.send(JSON.stringify({ setup: { model: 'models/' + model, generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } },
      systemInstruction: { parts: [{ text: `You are a text-to-speech engine for a children's game. Delivery: ${style}. The user sends Hebrew lines. Read every line aloud exactly as written, as separate utterances with about one second of silence between lines. Say nothing else and add no comments.` }] } } }));
    ws.onmessage = async (e) => {
      const d = JSON.parse(typeof e.data === 'string' ? e.data : await e.data.text());
      if (d.setupComplete) ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: lines.join('\n') }] }], turnComplete: true } }));
      const sc = d.serverContent;
      for (const p of (sc && sc.modelTurn && sc.modelTurn.parts) || []) if (p.inlineData) chunks.push(Buffer.from(p.inlineData.data, 'base64'));
      if (sc && sc.turnComplete) { clearTimeout(timer); ws.close(); resolve({ buf: Buffer.concat(chunks), mime: 'audio/pcm;rate=24000' }); }
      if (d.error) { clearTimeout(timer); ws.close(); reject(new Error(JSON.stringify(d.error).slice(0, 200))); }
    };
    ws.onerror = (e) => { clearTimeout(timer); reject(new Error('ws error ' + (e.message || ''))); };
  });
}

async function tts(model, voiceName, style, lines) {
  if (/native-audio/.test(model)) return ttsLive(model, voiceName, style, lines);
  const text = `Say ${style}. Read each of the following lines as its own separate utterance, with about one second of complete silence between the lines. Say only the lines themselves, nothing else:\n\n${lines.join('\n\n')}`;
  const body = { contents: [{ parts: [{ text }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } } } };
  for (let attempt = 0; attempt < 5; attempt++) {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${KEY}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const raw = await r.text();
    if (r.ok) {
      const part = JSON.parse(raw).candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (part) return { buf: Buffer.from(part.inlineData.data, 'base64'), mime: part.inlineData.mimeType };
    } else if (r.status === 429) {
      if (/PerDay/i.test(raw)) { dead.add(model); throw new Error('daily quota used up for ' + model); }
      const wait = Number((raw.match(/retry in ([\d.]+)s/i) || [])[1] || 10);
      await sleep((wait + 2) * 1000);
      continue;
    } else if (r.status < 500) throw new Error(`${r.status} ${raw.slice(0, 300)}`);
    await sleep(2000 * (attempt + 1));
  }
  throw new Error('gave up after retries');
}

// Cut one long take into per-line clips at the silent gaps; if the take has too many pieces,
// the pieces separated by the smallest gaps are merged. Fewer pieces than lines = failure.
function splitTake(take, count) {
  const wav = take.mime.includes('wav') ? take.buf : writeWav(new Int16Array(take.buf.buffer.slice(take.buf.byteOffset, take.buf.byteOffset + (take.buf.length & ~1))), Number((take.mime.match(/rate=(\d+)/) || [])[1] || 24000));
  const { rate, pcm } = parseWav(wav);
  const win = Math.round(rate * 0.02);
  let peak = 0;
  for (const v of pcm) peak = Math.max(peak, Math.abs(v));
  const thr = Math.max(300, peak * 0.02);
  const cut = (minGap) => {
    const out = [];
    let cur = null, quiet = 0;
    for (let i = 0; i + win <= pcm.length; i += win) {
      let m = 0;
      for (let k = 0; k < win; k++) m = Math.max(m, Math.abs(pcm[i + k]));
      if (m >= thr) { if (!cur) cur = { a: i, b: i + win }; cur.b = i + win; quiet = 0; }
      else if (cur && ++quiet * win / rate >= minGap) { out.push(cur); cur = null; quiet = 0; }
    }
    if (cur) out.push(cur);
    return out;
  };
  let runs = [];
  for (const g of [0.32, 0.24, 0.17]) { runs = cut(g); if (runs.length >= count) break; }
  while (runs.length > count) {
    let best = 1, gap = Infinity;
    for (let i = 1; i < runs.length; i++) if (runs[i].a - runs[i - 1].b < gap) { gap = runs[i].a - runs[i - 1].b; best = i; }
    runs.splice(best - 1, 2, { a: runs[best - 1].a, b: runs[best].b });
  }
  if (runs.length < count) return null;
  return runs.map((r) => writeWav(pcm.slice(Math.max(0, r.a - win * 2), Math.min(pcm.length, r.b + win * 2)), rate));
}

// ---------- WAV helpers (24 kHz mono 16-bit PCM from the API) ----------
function parseWav(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF') return { rate: 24000, pcm: new Int16Array(buf.buffer, buf.byteOffset, buf.length >> 1) };
  let p = 12, rate = 24000;
  while (p + 8 <= buf.length) {
    const id = buf.toString('ascii', p, p + 4), size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') rate = buf.readUInt32LE(p + 12);
    if (id === 'data') {
      const end = Math.min(buf.length, p + 8 + size);
      const bytes = Buffer.from(buf.subarray(p + 8, end));
      return { rate, pcm: new Int16Array(bytes.buffer, bytes.byteOffset, bytes.length >> 1) };
    }
    p += 8 + size + (size & 1);
  }
  throw new Error('no data chunk');
}
function writeWav(pcm, rate) {
  const h = Buffer.alloc(44), n = pcm.length * 2;
  h.write('RIFF', 0); h.writeUInt32LE(36 + n, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(n, 40);
  return Buffer.concat([h, Buffer.from(pcm.buffer, pcm.byteOffset, n)]);
}
const durationOf = (buf) => { const { rate, pcm } = parseWav(buf); return pcm.length / rate; };

// Trim leading/trailing silence, normalize loudness, add tiny fades so clips chain without clicks.
function clean(buf) {
  const { rate, pcm } = parseWav(buf);
  let peak = 0;
  for (const v of pcm) peak = Math.max(peak, Math.abs(v));
  const thr = Math.max(250, peak * 0.035);
  let a = 0, b = pcm.length - 1;
  while (a < b && Math.abs(pcm[a]) < thr) a++;
  while (b > a && Math.abs(pcm[b]) < thr) b--;
  const pad = Math.round(rate * 0.04);
  a = Math.max(0, a - pad); b = Math.min(pcm.length - 1, b + Math.round(rate * 0.09));
  const out = new Int16Array(b - a + 1);
  const gain = Math.min(3, (32767 * 0.89) / Math.max(peak, 1));
  const fade = Math.round(rate * 0.006);
  for (let i = 0; i < out.length; i++) {
    let v = pcm[a + i] * gain;
    if (i < fade) v *= i / fade;
    if (out.length - 1 - i < fade) v *= (out.length - 1 - i) / fade;
    out[i] = Math.max(-32768, Math.min(32767, Math.round(v)));
  }
  return { wav: writeWav(out, rate), seconds: out.length / rate };
}

function encode(id, wav) {
  const tmp = `content/voice/raw/_tmp.wav`;
  writeFileSync(tmp, wav);
  execFileSync(FFMPEG, ['-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-c:a', 'libopus', '-b:a', '36k', '-application', 'voip', `public/voice/${id}.ogg`]);
}

// ---------- verify ----------
const norm = (s) => s.replace(/[^א-ת]/g, '');
function similarity(a, b) {
  if (!a.length && !b.length) return 1;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - dp[a.length][b.length] / Math.max(a.length, b.length);
}
async function transcribe(buf) {
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${KEY}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: 'Transcribe this Hebrew audio exactly. Output only the transcript, nothing else.' }, { inlineData: { mimeType: 'audio/wav', data: buf.toString('base64') } }] }] })
  });
  const j = await r.json();
  return j.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

async function pool(items, worker) {
  const q = items.slice();
  await Promise.all(Array.from({ length: CONCURRENCY }, async () => { while (q.length) await worker(q.shift()); }));
}

async function main() {
  if (!KEY && !onlyProcess) throw new Error('set GEMINI_API_KEY');
  const raw = (c) => `content/voice/raw/${c.id}.wav`;
  const sane = (c, buf) => { const d = durationOf(buf); return d > 0.25 && d < 2 + c.text.length * 0.2; };

  if (!onlyProcess && !verify) {
    const todo = clips.filter((c) => (ids.length ? ids.includes(c.id) : !existsSync(raw(c))));
    // One batch = clips with the same voice, model and delivery style.
    const byKey = new Map();
    for (const c of todo) {
      const v = spec.voices[c.voice];
      const k = [c.model || v.model || MODEL, v.voice, c.style].join('|');
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(c);
    }
    const batches = [];
    for (const [k, list] of byKey) for (let i = 0; i < list.length; i += (/native-audio/.test(k) ? 4 : BATCH)) batches.push({ k, list: list.slice(i, i + (/native-audio/.test(k) ? 4 : BATCH)) });
    console.log(`generating ${todo.length}/${clips.length} clip(s) in ${batches.length} request(s)...`);
    const run = async ({ k, list }, depth = 0) => {
      const [model, voiceName, style] = k.split('|');
      if (dead.has(model)) { console.log('SKIP (quota)', list.map((c) => c.id).join(' ')); return; }
      if (/native-audio/.test(model)) {   // Live API: one clip per session, no splitting needed
        for (const c of list) {
          for (let t = 0; t < 3; t++) {
            try {
              // Some very short words come back empty on their own: ask for three repeats and keep the first.
              const triple = t > 0;
              const take = await ttsLive(model, voiceName, style, triple ? [c.text, c.text, c.text] : [c.text]);
              let wav = writeWav(new Int16Array(take.buf.buffer.slice(take.buf.byteOffset, take.buf.byteOffset + (take.buf.length & ~1))), 24000);
              if (triple && take.buf.length > 4000) { const pieces = splitTake(take, 3); if (pieces) wav = pieces[0]; }
              if (!sane(c, wav)) { console.log('odd length', c.id, durationOf(wav).toFixed(1) + 's, retrying'); continue; }
              writeFileSync(raw(c), wav);
              console.log('OK  ', c.id, durationOf(wav).toFixed(1) + 's', c.text);
              break;
            } catch (e) { console.log('ERR ', c.id, e.message); }
          }
        }
        return;
      }
      try {
        const take = await tts(model, voiceName, style, ['שלום', ...list.map((c) => c.text)]);   // 1st piece is a throw-away (absorbs any spoken preamble)
        const parts = (splitTake(take, list.length + 1) || []).slice(1);
        if (parts.length !== list.length) throw new Error('too few pieces');
                list.forEach((c, i) => {
          if (!sane(c, parts[i])) { console.log('odd length', c.id, durationOf(parts[i]).toFixed(1) + 's'); return; }
          writeFileSync(raw(c), parts[i]);
          console.log('OK  ', c.id, durationOf(parts[i]).toFixed(1) + 's', c.text);
        });
      } catch (e) {
        console.log('ERR ', list[0].id + '…', e.message);
        if (!dead.has(model) && depth < 1 && list.length > 3) { // retry as two smaller takes
          const h = list.length >> 1;
          await run({ k, list: list.slice(0, h) }, depth + 1);
          await run({ k, list: list.slice(h) }, depth + 1);
        }
      }
    };
    await pool(batches, (b2) => run(b2));
    const left = clips.filter((c) => !existsSync(raw(c))).length;
    if (left) console.log(`\n${left} clip(s) still missing — run again (daily free quota resets every 24h), or enable billing for the key.`);
  }

  if (verify) {
    const bad = [];
    await pool(clips.filter((c) => existsSync(raw(c)) && (!ids.length || ids.includes(c.id))), async (c) => {
      const heard = await transcribe(readFileSync(raw(c)));
      if (!heard) { console.log('NOTE  no transcript for', c.id, '(quota?)'); return; }
      const sim = similarity(norm(c.text), norm(heard));
      if (sim < 0.75) { bad.push(c.id); console.log(`CHECK ${c.id} ${sim.toFixed(2)}  wanted "${c.text}"  heard "${heard}"`); }
    });
    console.log(bad.length ? `\n${bad.length} suspicious clip(s). Regenerate: node scripts/gen-voice.mjs ${bad.join(' ')}` : 'all clips verified');
    return;
  }

  const manifest = { groups: groupSizes, clips: {} };
  for (const c of clips) {
    if (!existsSync(raw(c))) { console.log('missing', c.id); continue; }
    const { wav, seconds } = clean(readFileSync(raw(c)));
    encode(c.id, wav);
    manifest.clips[c.id] = Math.round(seconds * 1000);
  }
  writeFileSync('public/voice/manifest.json', JSON.stringify(manifest));
  console.log(`processed ${Object.keys(manifest.clips).length} clips -> public/voice`);
}
main();
