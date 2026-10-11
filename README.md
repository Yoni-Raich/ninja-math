# נינג׳ה המספרים — Ninja Math

An Android action game for first graders that practices basic arithmetic: every attack, chest and boss hit is a math question. Built with Vite + vanilla JS (SVG art and CSS animation) and packaged with Capacitor.

- 72 worlds, including 60 new routes across 12 generated locations, and 30 new enemies/bosses
- Worlds and elite enemies unlock by earned belt: white, yellow, orange, green and black
- Each world mixes combat with stepping-stone jumps, trap defenses, and number gates with a keypad
- Bosses use shields, low/high waves, or two-move attack sequences; correct defenses avoid damage
- Route activities allow free retries and give a one-time coin bonus per completed activity
- Adaptive difficulty ladder (belts): add to 5 → add to 10 → subtract to 10 → make 10 → add to 20
- 3 hearts per world; wrong answers cost a heart, lose them all and the world restarts
- Procedural sound effects and music, parent area with real progress stats

## Develop

```bash
npm install
npm run dev
```

## Build the APK

```bash
npm run android
cd android && ./gradlew assembleDebug
```

Art lives in `design/components/*.dc.html` and is converted to JS with `npm run art`.
