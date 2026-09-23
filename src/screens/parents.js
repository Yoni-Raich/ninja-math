import { load, update, reset } from '../game/save.js';
import { SKILLS } from '../game/data.js';
import { shuffle } from '../game/learning.js';
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

function dashboard(root, go) {
  const s = load();
  const days = Object.keys(s.days).sort().slice(-7);
  const week = days.reduce((acc, d) => ({ answered: acc.answered + s.days[d].answered, correct: acc.correct + s.days[d].correct }), { answered: 0, correct: 0 });
  const cur = SKILLS[s.level];
  const rows = SKILLS.map((k, i) => {
    const st = s.stats[k.id] || { ok: 0, total: 0, ms: 0, timed: 0 };
    const pct = st.total ? Math.round((st.ok / st.total) * 100) : 0;
    const state = i < s.level ? 'done' : i === s.level ? 'now' : 'lock';
    const note = state === 'lock' ? (i === s.level + 1 ? 'החגורה הבאה' : 'נעול') : st.timed ? `${(st.ms / st.timed / 1000).toFixed(1)} שנ׳ לתרגיל` : state === 'now' ? 'בתרגול עכשיו' : '';
    return `<div style="display:flex;align-items:center;gap:10px;height:36px;padding:0 8px;margin:0 -8px;background:${state === 'now' ? '#F8E9E4' : 'transparent'};opacity:${state === 'lock' ? 0.55 : 1};">
      <svg width="34" height="18" viewBox="0 0 34 18" style="flex-shrink:0;" aria-hidden="true"><rect x="0.5" y="6" width="33" height="6" fill="${k.color}" stroke="#1A1A24" stroke-width="1"></rect><path d="M14 3 L20 3 L18 15 L16 15 Z" fill="${k.color}" stroke="#1A1A24" stroke-width="1"></path></svg>
      <span style="width:104px;font-size:14px;font-weight:700;">${k.name}</span>
      <div style="flex-grow:1;height:10px;background:#EDE6D8;overflow:hidden;"><div style="width:${pct}%;height:100%;background:${state === 'now' ? '#B42318' : '#1F8F66'};"></div></div>
      <span dir="ltr" style="width:66px;font-size:13px;font-weight:700;text-align:left;">${st.total ? pct + '% · ' + st.total : ''}</span>
      <span style="width:106px;font-size:12px;color:#5A5A6E;">${note}</span>
    </div>`;
  }).join('');
  const worst = SKILLS.slice(0, s.level + 1).map((k) => ({ k, st: s.stats[k.id] })).filter((x) => x.st && x.st.total >= 3).sort((a, b) => a.st.ok / a.st.total - b.st.ok / b.st.total)[0];
  const tip = !week.answered
    ? 'עוד אין נתונים. אחרי כמה קרבות יופיעו כאן דיוק, זמן תגובה והמלצות.'
    : worst && worst.st.ok / worst.st.total < 0.75
      ? `הכי מאתגר כרגע: ${worst.k.name} (${Math.round((worst.st.ok / worst.st.total) * 100)}% דיוק). המשחק ממשיך לתרגל את זה ומציג רמזים חזותיים עד שהדיוק עולה.`
      : `הדיוק טוב. כשתגיע לחגורה הבאה המשחק יעבור ל${SKILLS[Math.min(s.level + 1, SKILLS.length - 1)].name}.`;
  const toggle = (id, label, on) => `<label style="display:flex;align-items:center;gap:8px;font-size:13px;min-height:30px;cursor:pointer;"><input type="checkbox" id="${id}" ${on ? 'checked' : ''} style="width:20px;height:20px;accent-color:#B42318;"><span>${label}</span></label>`;

  root.innerHTML = `
  <div dir="rtl" style="position:absolute;inset:0;box-sizing:border-box;padding:12px 16px 14px;display:flex;flex-direction:column;gap:10px;background:#F4EFE6;color:#1A1A24;overflow:hidden;">
    <div style="display:flex;align-items:center;gap:12px;">
      <button id="back" aria-label="חזרה למשחק" style="width:44px;height:44px;box-sizing:border-box;border:2px solid #1A1A24;display:flex;align-items:center;justify-content:center;background:#FFFFFF;cursor:pointer;">${backIcon('#1A1A24')}</button>
      <div style="display:flex;flex-direction:column;">
        <h1 class="num" style="margin:0;font-size:22px;line-height:1.1;">מרחב הורים</h1>
        <span style="font-size:13px;color:#5A5A6E;">חגורה ${cur.belt} · ${cur.name} · השבוע: ${week.answered} תרגילים, ${week.answered ? Math.round((week.correct / week.answered) * 100) : 0}% נכון בניסיון ראשון</span>
      </div>
    </div>
    <div style="flex-grow:1;display:flex;gap:14px;min-height:0;">
      <div style="flex-grow:1;flex-basis:0;display:flex;flex-direction:column;gap:6px;padding:12px 14px;background:#FFFFFF;border:1px solid #DCD2BE;border-top:4px solid #B42318;">
        <div style="display:flex;align-items:baseline;gap:8px;"><span class="num" style="font-size:17px;">מסלול החגורות</span><span style="font-size:12px;color:#5A5A6E;">דיוק בניסיון הראשון · מספר תרגילים</span></div>
        ${rows}
        <div style="margin-top:auto;padding:8px 12px;background:#FBF3E0;border-right:3px solid #C98A12;font-size:13px;line-height:1.45;">${tip}</div>
      </div>
      <div style="width:330px;flex-shrink:0;display:flex;flex-direction:column;gap:8px;">
        <div style="padding:9px 12px;background:#FFFFFF;border:1px solid #DCD2BE;display:flex;flex-direction:column;gap:4px;font-size:13px;line-height:1.4;">
          <span class="num" style="font-size:16px;">איך הקושי מותאם</span>
          <span>4 מתוך 5 נכונות בניסיון ראשון ← חגורה חדשה</span>
          <span>2–3 מתוך 5 ← נשארים ומתאמנים</span>
          <span>1 או פחות מתוך 4 ← צעד אחורה, בלי הודעה</span>
          <span style="color:#5A5A6E;">בכל עולם יש 3 לבבות. טעות = היריב פוגע ולב יורד. בלי לבבות — מתחילים את העולם מחדש.</span>
        </div>
        <div style="padding:6px 12px;background:#FFFFFF;border:1px solid #DCD2BE;display:flex;flex-direction:column;">
          ${toggle('hints', 'רמזים חזותיים (נקודות ומסגרת עשר)', s.settings.hints)}
          ${toggle('speed', `מצב מהירות: טיימר של 10 שניות לתרגיל`, s.settings.speed)}
          ${toggle('sound', 'צלילים ומוזיקה', s.settings.sound)}
        </div>
        <button id="reset" style="height:44px;border:1px solid #B42318;background:#FFFFFF;color:#B42318;font-family:'Secular One',sans-serif;font-size:14px;cursor:pointer;">איפוס התקדמות</button>
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
