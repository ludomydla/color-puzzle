// hashUtils.js — PRNG, palette, and daily puzzle generation
// Depends on colorUtils.js being loaded first

// --- PRNG ---

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => {
    s += 0x6D2B79F5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function dateToSeed(date) {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate();
}

// --- Palette ---
// Oklab values computed at load time via hexToOklab (from colorUtils.js)

const PALETTE = [
  { name: 'Vermillion',     hex: '#E34234' },
  { name: 'Cobalt',         hex: '#0047AB' },
  { name: 'Ivory',          hex: '#FFFFF0' },
  { name: 'Ochre',          hex: '#CC7722' },
  { name: 'Sage',           hex: '#87AE73' },
  { name: 'Coral',          hex: '#FF6B6B' },
  { name: 'Crimson',        hex: '#DC143C' },
  { name: 'Ultramarine',    hex: '#3F00FF' },
  { name: 'Cadmium Yellow', hex: '#FFF600' },
  { name: 'Viridian',       hex: '#40826D' },
  { name: 'Burnt Sienna',   hex: '#E97451' },
  { name: 'Naples Yellow',  hex: '#FADA5E' },
  { name: 'Prussian Blue',  hex: '#003153' },
  { name: 'Alizarin',       hex: '#E32636' },
  { name: 'Zinc White',     hex: '#F8F8F2' },
].map(c => ({ ...c, oklab: hexToOklab(c.hex) }));

// --- Difficulty ---

function difficultyTier(dayOfWeek) {
  // 0=Sun, 1=Mon, ..., 6=Sat
  if (dayOfWeek === 1 || dayOfWeek === 2) return { minColors: 2, maxColors: 3, minUnits: 3, maxUnits: 4 };
  if (dayOfWeek === 3 || dayOfWeek === 4) return { minColors: 3, maxColors: 4, minUnits: 4, maxUnits: 6 };
  if (dayOfWeek === 5 || dayOfWeek === 6) return { minColors: 4, maxColors: 5, minUnits: 5, maxUnits: 7 };
  /* Sunday */                             return { minColors: 5, maxColors: 6, minUnits: 6, maxUnits: 8 };
}

// --- Helpers ---

function shuffled(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function randInt(min, max, rng) {
  // inclusive both ends
  return min + Math.floor(rng() * (max - min + 1));
}

// Distribute `total` units across `n` slots, each slot gets ≥1
function distributeUnits(n, total, rng) {
  const units = new Array(n).fill(1);
  let remaining = total - n;
  while (remaining > 0) {
    units[Math.floor(rng() * n)]++;
    remaining--;
  }
  return units;
}

// Min Oklab distance between any two colors in the set
function minPairwiseDist(colors) {
  let min = Infinity;
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const d = oklabDistance(colors[i].oklab, colors[j].oklab);
      if (d < min) min = d;
    }
  }
  return min;
}

// --- Puzzle Generation ---

const DISTINCT_THRESHOLD = 0.12; // min Oklab distance between palette colors
const MAX_ATTEMPTS = 100;

function generatePuzzle(date) {
  const seed = dateToSeed(date);
  const rng = mulberry32(seed);
  const tier = difficultyTier(date.getDay());

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const numColors = randInt(tier.minColors, tier.maxColors, rng);
    const totalUnits = randInt(tier.minUnits, tier.maxUnits, rng);

    // Ensure totalUnits ≥ numColors (each needs ≥1 unit)
    if (totalUnits < numColors) continue;

    const pool = shuffled(PALETTE, rng);
    const selected = pool.slice(0, numColors);

    // Validate perceptual distinctness
    if (minPairwiseDist(selected) < DISTINCT_THRESHOLD) continue;

    const unitCounts = distributeUnits(numColors, totalUnits, rng);

    // Build recipe: colorName → unit count (only colors with ≥1 unit)
    const recipe = {};
    const colorUnitsForMix = [];
    for (let i = 0; i < numColors; i++) {
      recipe[selected[i].name] = unitCounts[i];
      colorUnitsForMix.push({ oklab: selected[i].oklab, units: unitCounts[i] });
    }

    const targetOklab = mixColors(colorUnitsForMix);
    const targetHex = oklabToHex(targetOklab.L, targetOklab.a, targetOklab.b);

    return {
      availableColors: selected,  // [{name, hex, oklab}, ...]
      totalUnits,
      recipe,                     // {colorName: units}
      targetHex,
      targetOklab,
    };
  }

  throw new Error(`generatePuzzle: failed to generate valid puzzle after ${MAX_ATTEMPTS} attempts`);
}
