# Color Mix Puzzle Game — Game Design Document

## Setup

Each round, the player sees a target color. They're told which colors are available to mix (for example: red, blue, white) and how many total units the target requires (for example: 5). They have 6 attempts to find the exact recipe.

## Making a Guess

The player constructs a recipe by choosing exactly N units from the available colors, in any combination. So with 5 units and three available colors, a guess might be red, red, blue, white, white. Order doesn't matter — only the count of each color matters. The system mixes the colors in those proportions and displays the resulting color.

## Feedback

After each guess, the player sees their mixed color displayed alongside the target, plus a single percentage value indicating how close the mix is to the target. No other hints — no "too much red" or "not enough blue." Just the visual comparison and the percentage. All previous guesses remain visible with their results and percentages, so the player can compare across attempts and reason about what to adjust.

## Winning and Losing

If the player hits 100% (exact match), they win. If they exhaust all 6 attempts without matching, they lose. Duplicate guesses are detected and rejected — they don't consume an attempt.

## Color Mixing Model

Colors mix by weighted average in Oklab perceptual color space. Each unit contributes equally. So 3 red + 2 white produces a color that is 60% red, 40% white — a medium pink.

Oklab is used instead of RGB because the game simulates paint/pigment mixing, which is subtractive — mixing colors should darken and desaturate realistically, not brighten toward white as RGB would. Oklab also ensures that distances in color space correspond to perceived visual differences, which is critical because the closeness percentage is the player's primary feedback mechanism. A 5% difference in Oklab actually looks like a 5% difference to the human eye.

The closeness percentage is calculated as Euclidean distance between the player's mix and the target in Oklab space, mapped to a 0–100% scale.

Implementation: all colors are stored internally as Oklab values. All mixing math (weighted averaging) happens in Oklab space. Distance/closeness is calculated in Oklab space. Conversion to sRGB happens only at the final step for display.

## Difficulty Scaling

Harder puzzles increase the number of available colors, increase the total units, and use target colors that are ambiguous or counterintuitive to decompose — like providing pre-mixed colors (orange, teal, lavender) instead of primaries, or targets where two plausible recipes produce visually similar but numerically different results.

Difficulty follows a weekly cycle: Monday is easy, progressing to Sunday as the hardest. The day of the week determines the difficulty tier (number of available colors, total units), while the date seed determines the specific puzzle content within that tier.

## Daily Puzzle Generation

Each day's puzzle is generated deterministically from the current date — no server or stored puzzle list required. Every player gets the same puzzle on the same day.

**Seed.** The date is converted to an integer: `year * 10000 + month * 100 + day` (e.g., 20260319 for March 19, 2026). This seeds a simple PRNG such as mulberry32 or splitmix32 (5–6 lines of code, good distribution, fully deterministic).

**Master palette.** A hand-curated set of 15–20 named colors (e.g., vermillion, cobalt, ochre, ivory, sage, coral) with pre-defined Oklab values. The generator selects subsets from this palette. This ensures every puzzle is visually appealing and avoids ugly or indistinguishable random colors.

**Generation sequence.** The PRNG sequence is consumed in order to build the puzzle: the day of the week selects the difficulty tier (determining how many available colors and total units), the next random numbers select which colors from the master palette form the available set, the next random numbers distribute the total units across the available colors to create the target recipe. The target color is then computed by mixing the recipe in Oklab space.

**Validation rules.** After generating a candidate puzzle, it is checked against quality constraints: the recipe must use at least two different colors, the available colors must be sufficiently distinct from each other in Oklab space, and the total unit count must be within the desired range for the difficulty tier. If a candidate fails validation, the next random numbers in the sequence are consumed to generate a new candidate. Since the PRNG is deterministic, rejection sampling still produces the same puzzle for everyone on the same day.

## Technical Stack

Vanilla HTML, CSS, and JavaScript — no frameworks, no build step, no dependencies.

**Rationale.** The game is small enough that a framework adds weight with no benefit. The entire game (HTML, CSS, JS, puzzle data) should fit under 15–20KB. No build toolchain means the project is editable anywhere, hostable anywhere, and stays maintainable long-term.

**Offline support.** A Service Worker (roughly 20 lines) caches all files on first visit. Combined with a `manifest.json`, the game becomes an installable PWA — launchable from the home screen, works fully offline. If a browser doesn't support Service Workers, the game still works, just without offline caching.

**Mobile support.** Viewport meta tag and relative units (rem, vh, vw, percentages). The UI is simple enough to adapt with flexbox wrapping and minimal media queries.

**File structure:**

- `index.html` — markup and manifest link
- `style.css` — all styling
- `game.js` — game logic, color math, DOM updates
- `sw.js` — service worker for offline caching
- `manifest.json` — PWA metadata (name, icon, theme color)
- `icon.png` — app icon
