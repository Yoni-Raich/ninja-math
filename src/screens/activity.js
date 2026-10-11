import { sfx, haptic } from '../audio.js';
import { coin } from '../ui.js';

export const ACTION_ICONS = {
  jump: '<path d="M8 27 H36 M12 19 Q22 0 32 19 M27 14 L32 19 L36 12" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>',
  block: '<path d="M22 3 L37 9 V21 Q37 32 22 39 Q7 32 7 21 V9 Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M15 21 L20 26 L29 16" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>'
};
const icon = (action) => `<svg width="44" height="44" viewBox="0 0 44 44" aria-hidden="true">${ACTION_ICONS[action]}</svg>`;
const labels = { jump: 'קפיצה', block: 'מגן' };
const titles = { jump: 'שביל האבנים', trap: 'דרך המלכודות', gate: 'שער המספרים', defense: 'הבוס תוקף!' };
const HELP = { jump: 'קפצו מאבן לאבן ואספו את המטבעות!', trap: 'קוצים למטה? קפצו! קליע באוויר? הפעילו מגן!', gate: 'פתרו והקישו את המספר שפותח את השער.' };

// Route challenges allow free retries. Boss defense calls onFail after a wrong move.
export default function activity(host, config, { question, later, onMove, onAttempt, onDone, onFail, isPaused }) {
  let busy = false, disposed = false, step = 0, value = '', tried = false;
  let started = performance.now(), pausedAt = 0, pausedMs = 0;
  const paused = () => disposed || isPaused();
  const kind = config.kind;
  host.innerHTML = `<section class="activity activity-${kind}" data-activity="${kind}" aria-label="${titles[kind]}">
    <div class="activity-heading"><span class="activity-kicker">${kind === 'defense' ? 'התגוננות' : 'הרפתקה בדרך'}</span>
      <h2>${titles[kind]}</h2><p>${config.hint || HELP[kind] || ''}</p></div>
    <div class="activity-scene" aria-hidden="true"></div>
    <div class="activity-controls"></div>
    <div class="activity-message" role="status" aria-live="polite"></div>
    ${kind !== 'defense' ? `<span class="activity-prize">${coin(21)} +${config.reward}</span>` : ''}
  </section>`;
  const $ = (s) => host.querySelector(s);
  const message = (text, good = false) => { $('.activity-message').textContent = text; $('.activity-message').classList.toggle('good', good); };
  const finish = () => {
    if (disposed) return;
    busy = true;
    message(kind === 'gate' ? 'השער נפתח!' : kind === 'defense' ? 'התחמקות מושלמת!' : 'עברתם את הדרך!', true);
    $('.activity').classList.add('activity-success');
    sfx(kind === 'defense' ? 'block' : 'coin'); haptic('light');
    later(750, () => { if (!disposed) { disposed = true; host.innerHTML = ''; onDone(config); } });
  };

  function move(action) {
    if (busy || paused()) return;
    sfx('tap');
    const expected = kind === 'jump' ? 'jump' : config.moves[step];
    if (action !== expected) {
      if (kind === 'defense') {
        busy = true;
        message(expected === 'jump' ? 'מעל גל נמוך קופצים!' : 'קליע באוויר חוסמים עם המגן!');
        $('.activity').classList.add('activity-miss');
        later(650, () => { if (!disposed) { disposed = true; host.innerHTML = ''; onFail(); } });
      } else {
        message(expected === 'jump' ? 'הקוצים למטה — נסו קפיצה!' : 'הקליע באוויר — נסו מגן!');
        sfx('block');
      }
      return;
    }
    busy = true;
    $('.activity').classList.add('activity-moving');
    onMove(action, step, kind);
    sfx(action === 'jump' ? 'whoosh' : 'block');
    later(650, () => {
      if (disposed) return;
      step += 1; busy = false;
      $('.activity').classList.remove('activity-moving');
      if (step >= (kind === 'jump' ? config.steps : config.moves.length)) finish();
      else { message('יפה! ממשיכים', true); renderMovement(); }
    });
  }

  function renderMovement() {
    const scene = $('.activity-scene');
    if (kind === 'jump') {
      scene.innerHTML = `<div class="stone-gap"></div><div class="stones">${Array.from({ length: config.steps }, (_, i) =>
        `<div class="stepping-stone ${i < step ? 'stone-done' : ''}"><span>${coin(26)}</span><b>${i + 1}</b></div>`).join('')}</div>`;
    } else {
      const action = config.moves[step];
      scene.innerHTML = `<div class="move-track" dir="ltr">${config.moves.map((m, i) => `<span class="move-cue ${i < step ? 'cue-done' : i === step ? 'cue-now' : ''}" aria-label="${labels[m]}">${icon(m)}${i < step ? '<b>✓</b>' : ''}</span>`).join('<span class="cue-arrow">›</span>')}</div>
        <div class="hazard ${action === 'jump' ? 'hazard-ground' : 'hazard-air'}">${action === 'jump'
          ? '<svg viewBox="0 0 380 72" width="380" height="72"><path d="M0 70 L24 10 L48 70 L72 10 L96 70 L120 10 L144 70 L168 10 L192 70 L216 10 L240 70 L264 10 L288 70 L312 10 L336 70 L360 10 L384 70" fill="#A4B4CA" stroke="#0B0B14" stroke-width="4"/></svg>'
          : '<span class="air-bolt">➤</span><span class="air-bolt">➤</span><span class="air-bolt">➤</span>'}</div>
        <div class="hazard-label">${action === 'jump' ? 'נמוך — קפצו מעל!' : 'באוויר — חסמו!'}</div>`;
    }
    $('.activity-controls').innerHTML = `<div class="move-buttons">${(kind === 'jump' ? ['jump'] : ['jump', 'block']).map((action) =>
      `<button class="move-button" data-action="${action}" aria-label="${labels[action]}">${icon(action)}<span>${labels[action]}</span></button>`).join('')}</div>
      <span class="activity-step">${step + 1} / ${kind === 'jump' ? config.steps : config.moves.length}</span>`;
    host.querySelectorAll('[data-action]').forEach((b) => { b.onclick = () => move(b.dataset.action); });
  }

  function submit() {
    if (busy || paused() || value === '') return;
    const ok = Number(value) === question.ans;
    if (!tried) {
      tried = true;
      onAttempt(question, ok, performance.now() - started - pausedMs);
    }
    if (ok) { $('.number-gate').classList.add('gate-open'); finish(); }
    else {
      message('נסו שוב. הנקודות יעזרו!');
      $('.gate-hint').hidden = false;
      value = ''; renderValue(); sfx('block');
    }
  }
  function renderValue() {
    $('.gate-input').textContent = value || '?';
    $('[data-submit]').disabled = value === '';
  }
  function renderGate() {
    $('.activity-scene').innerHTML = `<div class="number-gate"><div class="gate-post"></div><div class="gate-door"><span>?</span></div><div class="gate-post"></div></div>
      <div class="gate-puzzle" dir="ltr"><div class="gate-equation">${question.parts.map((p) => `<span class="${p === '?' ? 'gate-input' : ''}">${p}</span>`).join('')}</div>
      <div class="gate-hint" ${question.skill === 'bond10' ? 'hidden' : ''}>${(question.skill === 'sub10' ? [question.dotsA] : [question.dotsA, question.dotsB]).map((dots) => `<span>${dots.map((d) => `<i style="--dot:${d.fill};opacity:${d.op ?? 1}" class="${d.cross ? 'dot-cross' : ''}"></i>`).join('')}</span>`).join('<b>+</b>')}</div></div>`;
    $('.activity-controls').innerHTML = `<div class="gate-pad" dir="ltr">${[1, 2, 3, 4, 5, 6, 7, 8, 9, '⌫', 0, '✓'].map((n) => `<button ${n === '✓' ? 'data-submit' : n === '⌫' ? 'data-clear' : `data-digit="${n}"`} aria-label="${n === '✓' ? 'פתיחת השער' : n === '⌫' ? 'מחיקת ספרה' : 'ספרה ' + n}">${n}</button>`).join('')}</div>`;
    host.querySelectorAll('[data-digit]').forEach((b) => { b.onclick = () => {
      if (busy || paused() || value.length >= 2) return;
      value = (value === '0' ? '' : value) + b.dataset.digit; renderValue(); sfx('tap');
    }; });
    $('[data-clear]').onclick = () => { if (!busy && !paused()) { value = value.slice(0, -1); renderValue(); } };
    $('[data-submit]').onclick = submit;
    renderValue();
  }
  if (kind === 'gate') renderGate(); else renderMovement();

  return {
    pause() { if (!pausedAt) pausedAt = performance.now(); $('.activity')?.classList.add('activity-paused'); },
    resume() { if (pausedAt) { pausedMs += performance.now() - pausedAt; pausedAt = 0; } $('.activity')?.classList.remove('activity-paused'); },
    unmount() { disposed = true; host.innerHTML = ''; }
  };
}
