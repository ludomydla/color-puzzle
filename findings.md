# Refactoring Impact Analysis — color-puzzle

## Symbol Map (133 symbols across 6 files)

| File | Public Functions | Key Constants |
|---|---|---|
| `colorUtils.js` | `srgbToLinear`, `linearToSrgb`, `linearRgbToXyz`, `xyzToLinearRgb`, `xyzToOklab`, `oklabToXyz`, `hexToOklab`, `oklabToHex`, `mixColors`, `oklabDistance`, `closeness` | `OKLAB_MAX_DIST` |
| `hashUtils.js` | `mulberry32`, `dateToSeed`, `difficultyTier`, `shuffled`, `randInt`, `distributeUnits`, `minPairwiseDist`, `generatePuzzle` | `PALETTE`, `DISTINCT_THRESHOLD`, `MAX_ATTEMPTS` |
| `game.js` | `totalSelected`, `recomputeUnits`, `addToSlot`, `removeFromSlot`, `isDuplicateGuess`, `submitGuess`, `loadStats`, `saveStats`, `init` | `STATE`, `MAX_GUESSES` |
| `render.js` | `renderTargetSwatch`, `renderPalette`, `renderCurrentGuess`, `renderUnitCounter`, `renderSubmitBtn`, `renderGuessHistory`, `renderStreak`, `showResultModal` | — |
| `renderUtils.js` | `showToast`, `pctToEmoji`, `buildShareText` | — |

---

## Blast Radius by Symbol

### `STATE` — Highest blast radius in the codebase

- **13 direct readers** across `game.js` and `render.js`
- Transitively reaches `init` at depth 2 (the entire app)
- Every render function reads it directly: `renderTargetSwatch`, `renderPalette`, `renderCurrentGuess`, `renderUnitCounter`, `renderSubmitBtn`, `renderGuessHistory`, `renderStreak`, `showResultModal`, plus all of `addToSlot`, `removeFromSlot`, `isDuplicateGuess`, `submitGuess`, `buildShareText`

> **Impact:** Any shape change to `STATE` (renaming fields, splitting it, adding a level of nesting) requires touching 13 functions in 2 files simultaneously. This is the most dangerous refactor in the project.

---

### `oklabDistance` — Deepest transitive chain (3 levels)

```
oklabDistance
  ├─ closeness          → submitGuess → init
  └─ minPairwiseDist    → generatePuzzle → init
```

- Changing its signature or metric (e.g., switching to Delta E 2000) propagates through 5 downstream functions across 3 files.

---

### `mixColors` / `oklabToHex` — Symmetric impact, medium blast

```
mixColors / oklabToHex
  ├─ submitGuess → init
  └─ generatePuzzle → init
```

- Both called in exactly the same two places. Refactoring either requires verifying both `submitGuess` (runtime path) and `generatePuzzle` (puzzle setup path).

---

### `hexToOklab` — Hidden dependency, tool blind spot

- Impact radius tool returned **0** — but this is a false negative.
- Called inside a module-level `.map()` on `PALETTE` in `hashUtils.js:39`, which is not inside a named function and thus invisible to static call graph analysis.
- `PALETTE`'s Oklab values are computed **once at script load**. Any change to `hexToOklab` must be verified against `PALETTE` initialization, not just named function callers.

---

### `loadStats` — Cross-file coupling violation

```
loadStats (game.js)
  ├─ saveStats       (game.js)
  ├─ renderStreak    (render.js)  <- render layer calling game layer directly
  └─ showResultModal (render.js)  <- same violation
```

- `render.js` directly calls `loadStats` from `game.js`. This is a **layering violation**: the render layer reaches into game logic/persistence instead of receiving data as arguments.
- Refactoring `loadStats` (e.g., changing the localStorage key, schema, or abstracting it) requires changes in both `game.js` and `render.js`.

---

### `submitGuess` — Coordination hub, widest fan-out

Calls **10 distinct functions** from 3 modules:

| Callee | Module |
|---|---|
| `totalSelected`, `isDuplicateGuess`, `saveStats` | game.js |
| `mixColors`, `oklabToHex`, `closeness` | colorUtils.js |
| `renderGuessHistory`, `renderPalette`, `renderCurrentGuess`, `renderUnitCounter`, `renderSubmitBtn` | render.js |
| `showToast` | renderUtils.js |

- Any change to game state shape, color math API, or render API touches this function.

---

### `addToSlot` / `removeFromSlot` — Symmetric pair, must stay in sync

Both call exactly the same 4 render functions: `renderPalette`, `renderCurrentGuess`, `renderUnitCounter`, `renderSubmitBtn`. Adding any new UI element that needs to update on slot change requires modifying **both**.

---

### Low-risk / safe to refactor independently

| Symbol | Callers | Notes |
|---|---|---|
| `generatePuzzle` | only `init` | Fully isolated; easy to swap |
| `mulberry32` / `dateToSeed` | only `generatePuzzle` | No downstream leakage |
| `closeness` | only `submitGuess` | Safe to change metric |
| `renderGuessHistory` | only `submitGuess` | No init dependency |
| `showToast` | `submitGuess` + inline share handler | 2 callers only |
| `PALETTE` | only `generatePuzzle` | Adding/removing colors is low risk |
| `difficultyTier` | only `generatePuzzle` | Fully contained |

---

## Architectural Findings

### 1. No module system — all globals

Every function and constant is in the global scope. There are no imports/exports. This means:
- Any rename is a manual grep-and-replace across all files.
- The load order in `index.html` is a hidden dependency: `colorUtils.js` must load before `hashUtils.js` (for `hexToOklab` in `PALETTE`), and both before `game.js`/`render.js`.

### 2. render.js is not a pure view layer

`render.js` reads `STATE` directly and calls `loadStats`. A proper view layer would receive data as arguments. This coupling means render functions cannot be unit-tested without a full game state present.

### 3. `recomputeUnits` is always paired with render calls

`addToSlot` and `removeFromSlot` both call `recomputeUnits()` then all 4 render functions. `recomputeUnits` has no direct callers outside of these two — it is an internal state sync step that could be inlined or made implicit.

---

## Refactoring Risk Summary

| Refactor | Risk | Files touched | Notes |
|---|---|---|---|
| Change `STATE` shape | HIGH | game.js, render.js, renderUtils.js | 13 direct readers |
| Change `oklabDistance` signature | MEDIUM | colorUtils.js, hashUtils.js, game.js | 3-level chain |
| Change `mixColors` / `oklabToHex` | MEDIUM | colorUtils.js, hashUtils.js, game.js | 2 call sites each |
| Refactor `hexToOklab` | MEDIUM | colorUtils.js, hashUtils.js | Hidden PALETTE dependency |
| Introduce ES modules | MEDIUM | All JS + index.html | Load order becomes explicit |
| Change `loadStats` schema | LOW-MEDIUM | game.js, render.js | Cross-layer coupling |
| Add new render update to `addToSlot`/`removeFromSlot` | LOW-MEDIUM | game.js | Must sync both functions |
| Refactor `generatePuzzle` internals | LOW | hashUtils.js | 1 caller, isolated |
| Change `PALETTE` entries | LOW | hashUtils.js | Only read by generatePuzzle |
| Change `closeness` formula | LOW | colorUtils.js | 1 caller |
| Rename/restructure `renderGuessHistory` | LOW | render.js, game.js | 1 caller |
