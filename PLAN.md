# Color Mix — Development Plan

## Context

The repository is empty. This plan covers building the entire "Color Mix" daily puzzle game from scratch, as specified in CLAUDE.md. The game is a Wordle-style daily color-mixing puzzle using perceptual color science (Oklab). No frameworks, no build step, no dependencies — pure HTML/CSS/JS under 20KB.

---

## File Structure

- `colorUtils.js` — all Oklab color math and conversion functions
- `hashUtils.js` — PRNG, date seeding, and daily puzzle generation
- `game.js` — game state, submit logic, DOM wiring, app entry point
- `index.html` — markup (loads all three scripts)
- `style.css` — all styling
- `sw.js` — service worker for offline caching
- `manifest.json` — PWA metadata
- `icon.png` — app icon

---

## Phase 1 — Color Math (`colorUtils.js`)

Implement all color conversion and math from scratch:

- `srgbToLinear(c)` — gamma expansion (c ≤ 0.04045 ? c/12.92 : ((c+0.055)/1.055)^2.4)
- `linearToSrgb(c)` — inverse gamma
- `linearRgbToXyz(r, g, b)` → XYZ D65 using standard 3×3 matrix
- `xyzToOklab(x, y, z)` → {L, a, b} using Oklab's two-matrix transform
- `oklabToXyz(L, a, b)` → XYZ (inverse)
- `hexToOklab(hex)` — full pipeline: hex → sRGB → linear → XYZ → Oklab
- `oklabToHex(L, a, b)` — full pipeline back to `#rrggbb`
- `mixColors(colorUnits)` — weighted average in Oklab (each unit = 1 weight); returns Oklab
- `closeness(oklab1, oklab2)` — Euclidean distance mapped to 0–100%
  - Max distance constant derived from palette extremes (pre-calibrate to make scale meaningful)

---

## Phase 2 — PRNG & Puzzle Generation (`hashUtils.js`)

- `mulberry32(seed)` — returns a closure `() => float [0,1)`, pure PRNG
- `dateToSeed(date)` → `year * 10000 + month * 100 + day`
- `PALETTE` — array of 15–20 hand-curated named colors, each `{name, hex, oklab}`:
  - Vermillion, Cobalt, Ivory, Ochre, Sage, Coral, Crimson, Ultramarine, Cadmium Yellow, Viridian, Burnt Sienna, Naples Yellow, Prussian Blue, Alizarin, Zinc White
  - Oklab values pre-computed from hex via `hexToOklab` (from `colorUtils.js`)
- `difficultyTier(dayOfWeek)` → `{numColors, totalUnits}`:

  | Day | Colors | Units |
  |-----|--------|-------|
  | Mon–Tue | 2–3 | 3–4 |
  | Wed–Thu | 3–4 | 4–6 |
  | Fri–Sat | 4–5 | 5–7 |
  | Sun | 5+ | 6–8 |

- `generatePuzzle(date)`:
  ```
  seed = dateToSeed(date)
  rng = mulberry32(seed)
  tier = difficultyTier(date.getDay())

  loop until valid:
    shuffle PALETTE with rng → pick first numColors
    distribute totalUnits across colors (rng) → recipe {color: units}
    validate: ≥2 colors used, colors perceptually distinct in Oklab, units fit tier

  targetOklab = mixColors(recipe)
  return {availableColors, totalUnits, recipe, targetHex, targetOklab}
  ```

---

## Phase 3 — Game State & Logic (`game.js`)

```
STATE = {
  puzzle,           // from generatePuzzle
  guesses: [],      // [{units: {colorName: count}, mixedHex, pct}]
  currentUnits: {}, // colorName → count (in-progress guess)
  won: false,
  lost: false,
}
```

Functions:
- `submitGuess()` — validate total = N, check duplicate, compute mixed color + closeness, push to guesses, check win/loss
- `isDuplicateGuess(units)` — compare unit maps against prior guesses
- `updateUnitCount(colorName, delta)` — increment/decrement, clamp 0..totalUnits

Stats (localStorage only, non-critical):
- Track `gamesPlayed`, `wins`, `currentStreak`, `maxStreak`, keyed to date

---

## Phase 4 — HTML Structure (`index.html`)

```html
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="manifest" href="manifest.json">
  <link rel="stylesheet" href="style.css">
</head>
<body>
  #header        — title + streak display
  #target        — large color swatch + label "Target"
  #palette       — color swatches (named, clickable)
  #unit-counter  — "X / N units selected"
  #submit-btn    — disabled until exactly N selected
  #guess-history — list of prior attempts
  #result-modal  — win/loss overlay (hidden by default)
  <script src="colorUtils.js"></script>
  <script src="hashUtils.js"></script>
  <script src="game.js"></script>
</body>
```

---

## Phase 5 — Styling (`style.css`)

- CSS custom properties for colors/spacing
- `.swatch` — rounded square, color via inline `background-color`
- `.swatch.selected` — ring/border highlight
- Flexbox layout throughout; `flex-wrap: wrap` for palette + history
- Guess history row: mixed swatch + target swatch + percentage + unit breakdown
- Mobile-first: base styles for narrow screens, no media queries needed beyond `min-width` for desktop stretch
- Animations: subtle fade-in for new guess rows

---

## Phase 6 — DOM Wiring (`game.js`)

- On load: `generatePuzzle(new Date())` → render target swatch + palette
- Palette swatch click: +1/-1 unit buttons per swatch for mobile usability
- Submit click → `submitGuess()` → append row to `#guess-history`
- Win/loss: show `#result-modal` with share text (emoji grid of percentages)
- Share button: `navigator.clipboard.writeText(shareText)` with fallback

---

## Phase 7 — Service Worker & PWA (`sw.js`, `manifest.json`)

`sw.js`:
- Cache-first strategy for all local assets on install
- Cache name versioned (e.g. `color-mix-v1`)
- Fetch handler: return cache hit, else network + cache
- Asset list includes `colorUtils.js`, `hashUtils.js`, `game.js`

`manifest.json`:
- `name`, `short_name`, `start_url`, `display: standalone`
- `icons` pointing to `icon.png`
- `theme_color`, `background_color`

Register SW at bottom of `game.js`:
```js
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
```

---

## Build Order Summary

1. `colorUtils.js` — color math (testable via browser console)
2. `hashUtils.js` — PRNG + palette + puzzle generation
3. `game.js` — game state + submit logic
4. `index.html` — skeleton markup
5. `style.css` — full styling pass
6. `game.js` — DOM rendering + event wiring
7. `sw.js` + `manifest.json` — PWA layer
8. Manual QA: load in browser, play a full game, test offline mode

---

## Verification

- Open `index.html` directly in browser (no server needed) — game should render
- Play through a full game: select units, submit 6 guesses, confirm win/loss state
- Console-test color pipeline: `hexToOklab('#ff4500')` → round-trip via `oklabToHex` should return the same hex
- Console-test puzzle determinism: `generatePuzzle(new Date('2026-01-01'))` called twice returns identical output
- Run in browser DevTools → Application → Service Workers: confirm SW registered and assets cached
- Throttle to offline in DevTools → reload: game still loads
- Test on mobile viewport (375px width) in DevTools device emulator
- Check total transfer size: DevTools Network tab, confirm under 20KB
