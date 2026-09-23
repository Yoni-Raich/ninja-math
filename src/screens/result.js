import { worldScene } from '../game/art.js';
import Fighter from '../art/Fighter.js';
import TreasureChest from '../art/TreasureChest.js';
import { load } from '../game/save.js';
import { WORLDS, SKILLS } from '../game/data.js';
import { coin, star, belt } from '../ui.js';

// Victory (boss beaten) or defeat (out of hearts) summary.
export default function result(root, { go, params }) {
  const s = load();
  const w = WORLDS[params.world];
  const won = !!params.won;
  const next = Math.min(params.world + 1, WORLDS.length - 1);
  const isLast = params.world === WORLDS.length - 1;
  const acc = params.answered ? `${params.firstOk}/${params.answered}` : '—';
  const stars = params.stars || 0;

  root.innerHTML = `
  <div style="position:absolute;left:0;top:0;">${worldScene(w)}</div>
  <div style="position:absolute;inset:0;background:${won ? 'rgba(11,11,20,.45)' : 'rgba(40,0,8,.55)'};"></div>
  <div style="position:absolute;right:50px;bottom:44px;width:200px;height:220px;">
    <div style="width:200px;height:220px;transform:scaleX(-1) scale(1.05);transform-origin:50% 100%;">
      <div class="${won ? 'pose-win' : 'pose-idle'}" style="${won ? '' : 'filter:saturate(.5) brightness(.8);'}">${Fighter({ kind: s.eq.fighter, weapon: s.eq.weapon, aura: won ? 'fire' : 'none' })}</div>
    </div>
  </div>
  ${won ? `<div style="position:absolute;left:40px;bottom:48px;width:180px;height:150px;transform:scale(1.1);transform-origin:50% 100%;">${TreasureChest({ open: true })}</div>` : ''}

  <div class="victory" style="position:absolute;left:0;right:0;top:14px;display:flex;justify-content:center;">
    <h1 class="title-xl" style="margin:0;font-size:120px;line-height:.85;color:${won ? '#F5B82E' : '#E63946'};text-shadow:5px 5px 0 ${won ? '#B42318' : '#0B0B14'},-3px -3px 0 #0B0B14,3px -3px 0 #0B0B14,-3px 3px 0 #0B0B14;">${won ? 'ניצחון!' : 'הובסת!'}</h1>
  </div>

  <div class="panel-frame pop-in" style="position:absolute;left:272px;top:128px;width:372px;background:${won ? '#F5B82E' : '#E63946'};animation-delay:.4s;">
    <div class="panel-body" style="padding:10px 28px 14px;display:flex;flex-direction:column;gap:9px;">
      <div style="display:flex;align-items:center;justify-content:space-between;">
        <span class="num" style="font-size:16px;">${w.name} · ${won ? 'הושלם' : `נפלת בשלב ${(params.stage ?? 0) + 1} מתוך ${params.stages || w.path.length}`}</span>
        ${won ? `<div style="display:flex;gap:4px;" aria-label="${stars} כוכבים מתוך 3">${[0, 1, 2].map((i) => star(i < stars ? '#F5B82E' : '#3A3F5C', 26)).join('')}</div>` : ''}
      </div>
      <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;">
        <div style="padding:6px 4px;display:flex;flex-direction:column;align-items:center;background:#0B0B14;border:1px solid #2E3350;"><span style="font-size:12px;color:#B9C0D8;">נכון בניסיון ראשון</span><span dir="ltr" class="num" style="font-size:22px;color:#2FB380;">${acc}</span></div>
        <div style="padding:6px 4px;display:flex;flex-direction:column;align-items:center;background:#0B0B14;border:1px solid #2E3350;"><span style="font-size:12px;color:#B9C0D8;">קומבו שיא</span><span dir="ltr" class="num" style="font-size:22px;color:#F5B82E;">x${params.maxCombo || 0}</span></div>
        <div style="padding:6px 4px;display:flex;flex-direction:column;align-items:center;background:#0B0B14;border:1px solid #2E3350;"><span style="font-size:12px;color:#B9C0D8;">מטבעות</span><span class="num" style="display:flex;align-items:center;gap:3px;font-size:22px;color:#F5B82E;">${coin(18)}<span dir="ltr">+${params.earned || 0}</span></span></div>
      </div>
      ${params.newBelt ? (() => { const b = SKILLS.find((k) => k.id === params.newBelt); return `<div class="pop-in" style="display:flex;align-items:center;justify-content:center;gap:10px;padding:6px;background:#1E2238;border:1px dashed #F5B82E;animation-delay:.8s;">${belt(b.color, 46, 24)}<span class="num" style="font-size:17px;color:#F5B82E;">חגורה ${b.belt}! עכשיו: ${b.name}</span></div>`; })() : ''}
      <p style="margin:0;font-size:14px;color:#D0D4E4;text-align:center;">${won
        ? (isLast ? 'ניצחת את כל העולמות! אפשר לחזור ולאסוף 3 כוכבים בכל עולם.' : `נפתח עולם חדש: ${WORLDS[next].name}`)
        : 'כל טעות היא אימון. נסו שוב — הפעם עם הרמז של העין.'}</p>
      <div style="display:flex;gap:10px;justify-content:center;">
        ${won
          ? `<button id="a" class="btn-main" style="height:48px;padding:0 22px;"><span class="num unsk" style="font-size:18px;">${isLast ? 'למפה' : 'לעולם הבא'}</span></button>
             <button id="b" class="btn-sub"><span class="unsk">שוב</span></button>`
          : `<button id="a" class="btn-main cta" style="height:48px;padding:0 22px;"><span class="num unsk" style="font-size:18px;">נסו שוב</span></button>
             <button id="b" class="btn-sub"><span class="unsk">למפה</span></button>`}
      </div>
    </div>
  </div>`;

  const a = root.querySelector('#a');
  const b = root.querySelector('#b');
  if (won) {
    a.onclick = () => (isLast ? go('map') : go('battle', { world: next }));
    b.onclick = () => go('battle', { world: params.world });
  } else {
    a.onclick = () => go('battle', { world: params.world });
    b.onclick = () => go('map');
  }
  return { unmount() {} };
}
