# נינג׳ה המספרים — Ninja Math

An Android action game for first graders that practices basic arithmetic: every attack, chest and boss hit is a math question. Built with Vite + vanilla JS (SVG art and CSS animation) and packaged with Capacitor.

- 6 fighters, 5 enemies, 2 bosses, 9 weapons, 6 auras, 4 worlds
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
