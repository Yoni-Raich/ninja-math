import '@fontsource/karantina/400.css';
import '@fontsource/karantina/700.css';
import '@fontsource/secular-one/400.css';
import '@fontsource/assistant/400.css';
import '@fontsource/assistant/600.css';
import '@fontsource/assistant/700.css';
import './styles/anim.css';
import './styles/battle.css';
import './styles/app.css';
import { unlockAudio, startMusic, sfx } from './audio.js';
import { load } from './game/save.js';
import title from './screens/title.js';
import map from './screens/map.js';
import battle from './screens/battle.js';
import result from './screens/result.js';
import dojo from './screens/dojo.js';
import parents from './screens/parents.js';

const SCREENS = { title, map, battle, result, dojo, parents };
const stage = document.getElementById('stage');
let current = null;
let busy = false;

function fit() {
  const s = Math.min(window.innerWidth / 915, window.innerHeight / 412);
  stage.style.transform = `translate(-50%, -50%) scale(${s})`;
}
window.addEventListener('resize', fit);
fit();

export function go(name, params = {}, { instant = false } = {}) {
  if (busy) return;
  const swap = () => {
    if (current && current.unmount) current.unmount();
    const el = document.createElement('div');
    el.className = 'screen';
    stage.querySelectorAll('.screen').forEach((n) => n.remove());
    stage.insertBefore(el, stage.firstChild);
    current = SCREENS[name](el, { go, params });
  };
  if (instant) { swap(); return; }
  busy = true;
  const wipe = document.createElement('div');
  wipe.className = 'wipe wipe-in';
  stage.appendChild(wipe);
  sfx('whoosh');
  setTimeout(() => {
    swap();
    wipe.className = 'wipe wipe-out';
    setTimeout(() => { wipe.remove(); busy = false; }, 320);
  }, 300);
}

// First touch unlocks audio (browser/WebView autoplay rules), then music starts if enabled.
window.addEventListener('pointerdown', () => { unlockAudio(); if (load().settings.music) startMusic(); }, { once: true });

document.addEventListener('contextmenu', (e) => e.preventDefault());

go('title', {}, { instant: true });
