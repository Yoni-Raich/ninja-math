import Scene from '../art/Scene.js';
import Fighter from '../art/Fighter.js';
import { load, update } from '../game/save.js';
import { WORLDS, FIGHTERS } from '../game/data.js';
import { heroArt } from '../game/art.js';
import { coin, speakerIcon } from '../ui.js';
import { sfx, startMusic, stopMusic, unlockAudio } from '../audio.js';

export default function title(root, { go }) {
  const s = load();
  const others = ['sakura', 'raiden', 'jin', 'ryuko', 'ryu', 'kage'].filter((k) => k !== s.eq.fighter).slice(0, 2);
  root.innerHTML = `
  <div style="position:absolute;left:0;top:0;">${Scene({ world: 'rooftops', moving: false })}</div>
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse at 30% 55%, rgba(11,11,20,0) 40%, rgba(11,11,20,.75) 100%);"></div>
  <div style="position:absolute;left:30px;bottom:46px;width:200px;height:220px;transform:scale(.95);transform-origin:50% 100%;filter:brightness(.7);"><div class="pose-idle">${Fighter({ kind: others[0] })}</div></div>
  <div style="position:absolute;left:300px;bottom:46px;width:200px;height:220px;transform:scale(.95);transform-origin:50% 100%;filter:brightness(.7);"><div class="pose-idle">${Fighter({ kind: others[1] })}</div></div>
  <div style="position:absolute;left:160px;bottom:36px;width:200px;height:220px;transform:scale(1.25);transform-origin:50% 100%;"><div class="pose-idle">${heroArt(FIGHTERS.find((f) => f.id === s.eq.fighter) || FIGHTERS[0], { weapon: s.eq.weapon, aura: s.eq.aura === 'none' ? 'shadow' : s.eq.aura })}</div></div>

  <div style="position:absolute;top:40px;right:40px;width:400px;display:flex;flex-direction:column;align-items:center;">
    <span class="num sk" style="padding:2px 16px;background:#B42318;color:#FFFFFF;font-size:16px;">קרבות חשבון</span>
    <div style="position:relative;width:400px;height:130px;display:flex;align-items:center;justify-content:center;">
      <svg width="400" height="130" viewBox="0 0 400 130" style="position:absolute;left:0;top:0;" aria-hidden="true">
        <path d="M20 78 C 60 40, 150 30, 250 36 C 320 40, 370 30, 386 22 C 372 44, 330 60, 260 66 C 190 72, 110 80, 60 104 C 44 112, 26 110, 20 78 Z" fill="#B42318"></path>
        <path d="M40 92 C 100 70, 200 62, 300 58" stroke="#E63946" stroke-width="5" fill="none" stroke-linecap="round"></path>
        <g fill="#B42318"><circle cx="392" cy="34" r="4"></circle><circle cx="378" cy="54" r="2.5"></circle><circle cx="12" cy="100" r="3"></circle></g>
      </svg>
      <h1 class="title-xl" style="position:relative;margin:0;font-size:136px;line-height:1;color:#FFFFFF;text-shadow:4px 4px 0 #0B0B14,-2px -2px 0 #0B0B14,2px -2px 0 #0B0B14,-2px 2px 0 #0B0B14;">נינג׳ה</h1>
    </div>
    <span class="num" style="margin-top:-6px;font-size:40px;letter-spacing:3px;color:#F5B82E;text-shadow:3px 3px 0 #0B0B14;">המספרים</span>
  </div>

  <div style="position:absolute;right:40px;bottom:34px;width:400px;display:flex;flex-direction:column;align-items:center;gap:12px;">
    <button id="play" class="btn-main cta" style="width:300px;height:68px;">
      <svg width="34" height="34" viewBox="0 0 24 24" class="unsk" aria-hidden="true"><path d="M4 20 L16 8 M20 20 L8 8 M14 4 L20 4 L20 10 M10 4 L4 4 L4 10" stroke="#FFFFFF" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" fill="none"></path></svg>
      <span class="title-xl unsk" style="font-size:46px;line-height:1;">לקרב!</span>
    </button>
    <div style="display:flex;gap:12px;">
      <button id="map" class="btn-sub" style="width:144px;"><span class="unsk">מפת עולמות</span></button>
      <button id="dojo" class="btn-sub" style="width:144px;"><span class="unsk">דוג׳ו</span></button>
    </div>
  </div>

  <div class="chip" style="position:absolute;top:12px;right:14px;">${coin(22)}<span class="num" style="font-size:17px;color:#F5B82E;">${s.coins}</span></div>
  <div style="position:absolute;top:12px;left:14px;display:flex;gap:8px;">
    <button id="parents" class="chip" style="height:44px;border:none;color:#D0D4E4;font-size:14px;cursor:pointer;">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2" fill="none" stroke="#D0D4E4" stroke-width="2.4"></rect><path d="M8 10 V7 a4 4 0 0 1 8 0 V10" fill="none" stroke="#D0D4E4" stroke-width="2.4"></path></svg>
      <span>להורים</span>
    </button>
    <button id="sound" class="btn-icon" aria-label="צלילים" style="border-color:#3A3F5C;">${speakerIcon(s.settings.sound)}</button>
  </div>`;

  const q = (id) => root.querySelector('#' + id);
  q('play').onclick = () => go('battle', { world: Math.min(load().unlocked, WORLDS.length) - 1 });
  q('map').onclick = () => go('map');
  q('dojo').onclick = () => go('dojo');
  q('parents').onclick = () => go('parents');
  q('sound').onclick = () => {
    unlockAudio();
    update((d) => { const on = !d.settings.sound; d.settings.sound = on; d.settings.music = on; });
    const on = load().settings.sound;
    if (on) { startMusic(); sfx('tap'); } else stopMusic();
    q('sound').innerHTML = speakerIcon(on);
  };
  return { unmount() {} };
}
