# CLAUDE.md

## Project

Color Mix — a daily color mixing puzzle game (like Wordle, but for colors). Vanilla HTML/CSS/JS, no frameworks, no build step, no dependencies. Must work offline and on old mobile browsers.

## File Structure

- `index.html` — markup and manifest link
- `style.css` — all styling
- `game.js` — game logic, color math, DOM updates, daily puzzle generation
- `sw.js` — service worker for offline caching
- `manifest.json` — PWA metadata
- `icon.png` — app icon

## Tech Constraints

- No frameworks, no npm, no build tools
- No external dependencies — all color math implemented from scratch
- Total payload target: under 20KB
- Must work on mobile: use viewport meta, relative units (rem, vh, vw), flexbox
- Service Worker for offline/PWA support
- No localStorage for core game state (use it only for optional stats/streaks)

## Game Rules

1. Each round, player sees a **target color** and is told:
   - Which **named colors** are available to mix (e.g., vermillion, cobalt, ivory)
   - How many **total units** the target requires (e.g., 5)
2. Player has **6 attempts** to find the exact recipe
3. Each guess: player selects exactly N units from available colors (order irrelevant, only counts matter)
4. After each guess, player sees:
   - Their mixed color displayed next to the target
   - A **single percentage** showing closeness (0–100%)
5. **All previous guesses remain visible** with their results and percentages
6. **Duplicate guesses are rejected** (don't consume an attempt)
7. **100% = win**. 6 failed attempts = loss

## Color Mixing Model

- Use **Oklab** perceptual color space for all mixing and distance calculations
- Mixing = weighted average in Oklab space (each unit contributes equally)
- Closeness % = Euclidean distance in Oklab, mapped to 0–100% scale
- Convert to sRGB only for display
- Implement Oklab math from scratch (sRGB → linear RGB → XYZ → Oklab), no libraries

## Why Oklab (not RGB)

- Game simulates paint mixing (subtractive), not light mixing (additive)
- Oklab distances match human perception — a 5% difference looks like 5%
- Critical because the closeness % is the player's only feedback mechanism

## Daily Puzzle Generation

- **Deterministic from date**: seed = `year * 10000 + month * 100 + day`
- Use a simple PRNG (mulberry32 or splitmix32), seeded with date integer
- **Master palette**: 15–20 hand-curated named colors with pre-defined Oklab values (e.g., vermillion, cobalt, ochre, ivory, sage, coral)
- Generation sequence:
  1. Day of week selects difficulty tier (Monday = easy, Sunday = hard)
  2. PRNG selects which colors from master palette form the available set
  3. PRNG distributes total units across available colors → target recipe
  4. Mix recipe in Oklab → target color
- **Validation**: recipe uses ≥2 colors, available colors are distinct in Oklab, unit count fits difficulty tier. Reject and regenerate (consuming next PRNG values) if invalid

## Difficulty Tiers (by day of week)

- Easy (Mon–Tue): 2–3 available colors, 3–4 total units
- Medium (Wed–Thu): 3–4 available colors, 4–6 total units
- Hard (Fri–Sat): 4–5 available colors, 5–7 total units
- Expert (Sun): 5+ available colors, 6–8 total units

## UI/UX Guidelines

- Minimalist, clean design
- Target color displayed prominently
- Available colors shown as named, clickable swatches
- Unit counter showing how many units selected / total required
- Submit button (disabled until exactly N units selected)
- Guess history: list of all attempts with mixed color swatch + percentage
- Responsive: works on narrow mobile screens with flexbox wrapping
