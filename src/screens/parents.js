import { load, update, reset } from '../game/save.js';
import { SKILLS } from '../game/data.js';
import { shuffle, median, WINDOW, ACC_NEEDED, FAST_NEEDED, CHALLENGE_FACTOR } from '../game/learning.js';
import { backIcon } from '../ui.js';
import { sfx, startMusic, stopMusic } from '../audio.js';

// Parent gate: a multiplication a first-grader is unlikely to solve.
function gate(root, onPass, onBack) {
  const a = 6 + Math.floor(Math.random() * 4), b = 6 + Math.floor(Math.random() * 4);
  const ans = a * b;
  const choices = shuffle([ans, ans + a, ans - b, ans + 10]);
  root.innerHTML = `
  <div style="position:absolute;inset:0;background:#F4EFE6;color:#1A1A24;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;">
    <button id="back" aria-label="חזרה" style="position:absolute;top:14px;left:14px;width:44px;height:44px;border:2px solid #1A1A24;background:#FFFFFF;display:flex;align-items:center;justify-content:center;cursor:pointer;">${backIcon('#1A1A24')}</button>
    <h1 class="num" style="margin:0;font-size:26px;">כניסה להורים</h1>
    <p style="margin:0;font-size:16px;color:#5A5A6E;">כדי להמשיך, בחרו את התשובה הנכונה:</p>
    <div dir="ltr" class="num" style="font-size:44px;">${a} × ${b} = ?</div>
    <div style="display:flex;gap:14px;">${choices.map((c) => `<button class="g" data-v="${c}" style="width:96px;height:60px;border:2px solid #1A1A24;background:#FFFFFF;font-family:'Secular One',sans-serif;font-size:26px;cursor:pointer;">${c}</button>`).join('')}</div>
  </div>`;
  root.querySelector('#back').onclick = onBack;
  root.querySelectorAll('.g').forEach((btn) => {
    btn.onclick = () => {
      if (Number(btn.dataset.v) === ans) onPass();
      else { sfx('block'); btn.style.background = '#F8E1DE'; }
    };
  });
}

const sec = (ms) => (ms / 1000).toFixed(1);

// Response-time chart for the current skill: each dot is a first-try answer (red = wrong),
// the dashed line is the "fast" target the child is working toward.
function speedChart(log, targetMs) {
  const pts = log.slice(-24);
  if (pts.length < 2) return '<div style="height:92px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#5A5A6E;">הגרף יופיע אחרי כמה תרגילים</div>';
  const W = 300, H = 92, maxMs = Math.max(targetMs * 2, ...pts.map((p) => p.ms));
  const x = (i) => 8 + (i / (pts.length - 1)) * (W - 16);
  const y = (ms) => H - 8 - (Math.min(ms, maxMs) / maxMs) * (H - 16);
  const okPts = pts.map((p, i) => (p.ok ? `${x(i)},${y(p.ms)}` : null)).filter(Boolean).join(' ');
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-label="זמני תגובה אחרונים">
    <rect x="0" y="0" width="${W}" height="${H}" fill="#FBF8F1"></rect>
    <line x1="0" x2="${W}" y1="${y(targetMs)}" y2="${y(targetMs)}" stroke="#1F8F66" stroke-width="1.5" stroke-dasharray="4 4"></line>
    <text x="${W - 4}" y="${y(targetMs) - 4}" text-anchor="end" font-size="10" fill="#1F8F66">יעד ${sec(targetMs)} שנ׳</text>
    <polyline points="${okPts}" fill="none" stroke="#1A1A24" stroke-width="1.5" opacity="0.5"></polyline>
    ${pts.map((p, i) => `<circle cx="${x(i)}" cy="${y(p.ms)}" r="3.5" fill="${!p.ok ? '#B42318' : p.ms <= targetMs ? '#1F8F66' : '#C98A12'}"></circle>`).join('')}
  </svg>`;
}

function dashboard(root, go) {
  const s = load();
  const days = Object.keys(s.days).sort().slice(-7);
  const week = days.reduce((acc, d) => ({ answered: acc.answered + s.days[d].answered, correct: acc.correct + s.days[d].correct }), { answered: 0, correct: 0 });
  const cur = SKILLS[s.level];
  const skills = s.skills || {};
  const rows = SKILLS.map((k, i) => {
    const log = (skills[k.id] && skills[k.id].log) || [];
    const okTimes = log.filter((e) => e.ok).map((e) => e.ms);
    const recent = log.slice(-WINDOW);
    const pct = recent.length ? Math.round((recent.filter((e) => e.ok).length / recent.length) * 100) : 0;
    const med = median(okTimes.slice(-10));
    const first = median(okTimes.slice(0, 10));
    const trend = okTimes.length >= 14 && first - med > 300 ? ` · השתפר ב־${sec(first - med)} שנ׳` : '';
    const state = i < s.level ? 'done' : i === s.level ? 'now' : 'lock';
    const phase = skills[k.id] && skills[k.id].phase;
    const note = state === 'lock' ? (i === s.level + 1 ? 'החגורה הבאה' : 'נעול')
      : state === 'done' ? 'נשלט'
      : phase === 'challenge' ? 'קרב חגורה בבוס הבא' : med && med > k.targetMs ? 'מדייק, עובד על מהירות' : 'בתרגול';
    return `<div style="display:flex;align-items:center;gap:8px;height:34px;padding:0 8px;margin:0 -8px;background:${state === 'now' ? '#F8E9E4' : 'transparent'};opacity:${state === 'lock' ? 0.55 : 1};">
      <svg width="30" height="16" viewBox="0 0 34 18" style="flex-shrink:0;" aria-hidden="true"><rect x="0.5" y="6" width="33" height="6" fill="${k.color}" stroke="#1A1A24" stroke-width="1"></rect><path d="M14 3 L20 3 L18 15 L16 15 Z" fill="${k.color}" stroke="#1A1A24" stroke-width="1"></path></svg>
      <span style="width:92px;font-size:13px;font-weight:700;">${k.name}</span>
      <div style="width:70px;height:8px;background:#EDE6D8;overflow:hidden;flex-shrink:0;"><div style="width:${pct}%;height:100%;background:${state === 'now' ? '#B42318' : '#1F8F66'};"></div></div>
      <span dir="ltr" style="width:34px;font-size:12px;font-weight:700;text-align:left;">${log.length ? pct + '%' : ''}</span>
      <span style="flex-grow:1;font-size:12px;color:#5A5A6E;">${med ? `${sec(med)} שנ׳ (יעד ${sec(k.targetMs)})${trend}` : ''}</span>
      <span style="width:118px;font-size:12px;color:${phase === 'challenge' && state === 'now' ? '#B42318' : '#5A5A6E'};font-weight:${state === 'now' ? 700 : 400};">${note}</span>
    </div>`;
  }).join('');
  const curLog = (skills[cur.id] && skills[cur.id].log) || [];
  const toggle = (id, label, on) => `<label style="display:flex;align-items:center;gap:8px;font-size:13px;min-height:30px;cursor:pointer;"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} style="width:20px;height:20px;accent-color:#B42318;"><span>${label}</span></label>`;

  root.innerHTML = `
  <div dir="rtl" style="position:absolute;inset:0;box-sizing:border-box;padding:12px 16px 14px;display:flex;flex-direction:column;gap:8px;background:#F4EFE6;color:#1A1A24;overflow:hidden;">
    <div style="display:flex;align-items:center;gap:12px;">
      <button id="back" aria-label="חזרה למשחק" style="width:44px;height:44px;box-sizing:border-box;border:2px solid #1A1A24;display:flex;align-items:center;justify-content:center;background:#FFFFFF;cursor:pointer;">${backIcon('#1A1A24')}</button>
      <div style="display:flex;flex-direction:column;">
        <h1 class="num" style="margin:0;font-size:22px;line-height:1.1;">מרחב הורים</h1>
        <span style="font-size:13px;color:#5A5A6E;">חגורה ${cur.belt} · ${cur.name} · השבוע: ${week.answered} תרגילים, ${week.answered ? Math.round((week.correct / week.answered) * 100) : 0}% נכון בניסיון ראשון</span>
      </div>
    </div>
    <div style="flex-grow:1;display:flex;gap:12px;min-height:0;">
      <div style="flex-grow:1;flex-basis:0;display:flex;flex-direction:column;gap:4px;padding:10px 14px;background:#FFFFFF;border:1px solid #DCD2BE;border-top:4px solid #B42318;">
        <div style="display:flex;align-items:baseline;gap:8px;"><span class="num" style="font-size:16px;">מסלול החגורות</span><span style="font-size:12px;color:#5A5A6E;">דיוק ב־${WINDOW} האחרונים · זמן חציוני לתשובה נכונה</span></div>
        ${rows}
        <div style="margin-top:auto;display:flex;flex-direction:column;gap:2px;">
          <span class="num" style="font-size:13px;">זמני תגובה — ${cur.name}</span>
          ${speedChart(curLog, cur.targetMs)}
          <span style="font-size:11px;color:#5A5A6E;">ירוק = נכון ומהיר · כתום = נכון אבל איטי · אדום = טעות</span>
        </div>
      </div>
      <div style="width:320px;flex-shrink:0;display:flex;flex-direction:column;gap:8px;">
        <div style="padding:9px 12px;background:#FFFFFF;border:1px solid #DCD2BE;display:flex;flex-direction:column;gap:3px;font-size:12.5px;line-height:1.4;">
          <span class="num" style="font-size:15px;">איך עולים חגורה</span>
          <span><b>1. דיוק:</b> ${ACC_NEEDED} מתוך ${WINDOW} נכונות בניסיון ראשון.</span>
          <span><b>2. שטף:</b> לפחות ${FAST_NEEDED} מהן מהר מהיעד. הזמן נמדד בשקט, בלי טיימר על המסך.</span>
          <span><b>3. קרב חגורה:</b> הבוס הבא מגיע עם טיימר (פי ${CHALLENGE_FACTOR} מהיעד). מנצחים = חגורה חדשה.</span>
          <span style="color:#5A5A6E;">הרבה טעויות ברצף ← צעד אחורה, בשקט. בכל עולם 3 לבבות.</span>
        </div>
        <div style="padding:6px 12px;background:#FFFFFF;border:1px solid #DCD2BE;display:flex;flex-direction:column;">
          ${toggle('hints', 'רמזים חזותיים (נקודות ומסגרת עשר)', s.settings.hints)}
          ${toggle('speed', 'טיימר של 10 שניות בכל תרגיל (לא רק בקרב חגורה)', s.settings.speed)}
          ${toggle('sound', 'צלילים ומוזיקה', s.settings.sound)}
        </div>
        <button id="reset" style="height:40px;border:1px solid #B42318;background:#FFFFFF;color:#B42318;font-family:'Secular One',sans-serif;font-size:14px;cursor:pointer;">איפוס התקדמות</button>
      </div>
    </div>
  </div>`;

  root.querySelector('#back').onclick = () => go('title');
  root.querySelector('#hints').onchange = (e) => update((d) => { d.settings.hints = e.target.checked; });
  root.querySelector('#speed').onchange = (e) => update((d) => { d.settings.speed = e.target.checked; });
  root.querySelector('#sound').onchange = (e) => {
    update((d) => { d.settings.sound = e.target.checked; d.settings.music = e.target.checked; });
    if (e.target.checked) startMusic(); else stopMusic();
  };
  const resetBtn = root.querySelector('#reset');
  resetBtn.onclick = () => {
    if (resetBtn.dataset.armed) { reset(); dashboard(root, go); return; }
    resetBtn.dataset.armed = '1';
    resetBtn.textContent = 'בטוחים? לחצו שוב כדי למחוק הכל';
    resetBtn.style.background = '#B42318';
    resetBtn.style.color = '#FFFFFF';
  };
}

export default function parents(root, { go }) {
  gate(root, () => dashboard(root, go), () => go('title'));
  return { unmount() {} };
}
