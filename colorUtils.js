// colorUtils.js — Oklab color math, all from scratch

function srgbToLinear(c) {
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function linearToSrgb(c) {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

function linearRgbToXyz(r, g, b) {
  // sRGB D65 matrix
  return {
    x: 0.4124564 * r + 0.3575761 * g + 0.1804375 * b,
    y: 0.2126729 * r + 0.7151522 * g + 0.0721750 * b,
    z: 0.0193339 * r + 0.1191920 * g + 0.9503041 * b,
  };
}

function xyzToLinearRgb(x, y, z) {
  return {
    r:  3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    g: -0.9692660 * x + 1.8760108 * y + 0.0415560 * z,
    b:  0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  };
}

function xyzToOklab(x, y, z) {
  // M1: XYZ → LMS
  const l = 0.8189330101 * x + 0.3618667424 * y - 0.1288597137 * z;
  const m = 0.0329845436 * x + 0.9293118715 * y + 0.0361456387 * z;
  const s = 0.0482003018 * x + 0.2643662691 * y + 0.6338517070 * z;

  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);

  // M2: LMS → Lab
  return {
    L: 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_,
  };
}

function oklabToXyz(L, a, b) {
  // Inverse M2
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  // Inverse M1
  return {
    x:  1.2270138511 * l - 0.5577999807 * m + 0.2812561490 * s,
    y: -0.0405801784 * l + 1.1122568696 * m - 0.0716766787 * s,
    z: -0.0763812845 * l - 0.4214819784 * m + 1.5861632204 * s,
  };
}

function hexToOklab(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const { x, y, z } = linearRgbToXyz(srgbToLinear(r), srgbToLinear(g), srgbToLinear(b));
  return xyzToOklab(x, y, z);
}

function oklabToHex(L, a, b) {
  const { x, y, z } = oklabToXyz(L, a, b);
  const { r, g, b: bl } = xyzToLinearRgb(x, y, z);
  const clamp = (v) => Math.max(0, Math.min(1, v));
  const toHex = (v) => Math.round(clamp(linearToSrgb(v)) * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(bl)}`;
}

// colorUnits: [{oklab: {L, a, b}, units: number}, ...]
// Returns weighted average in Oklab space
function mixColors(colorUnits) {
  let totalUnits = 0, sumL = 0, sumA = 0, sumB = 0;
  for (const { oklab, units } of colorUnits) {
    sumL += oklab.L * units;
    sumA += oklab.a * units;
    sumB += oklab.b * units;
    totalUnits += units;
  }
  return { L: sumL / totalUnits, a: sumA / totalUnits, b: sumB / totalUnits };
}

// Euclidean distance in Oklab
function oklabDistance(c1, c2) {
  const dL = c1.L - c2.L, da = c1.a - c2.a, db = c1.b - c2.b;
  return Math.sqrt(dL * dL + da * da + db * db);
}

// Max distance covers full L range (0→1) plus typical chroma spread.
// Black {L:0,a:0,b:0} to white {L:1,a:0,b:0} = 1.0; with chroma headroom ~1.2
const OKLAB_MAX_DIST = 1.0;

// Returns 0–100 (100 = exact match)
function closeness(oklab1, oklab2) {
  const dist = oklabDistance(oklab1, oklab2);
  return Math.max(0, Math.round((1 - dist / OKLAB_MAX_DIST) * 100));
}
