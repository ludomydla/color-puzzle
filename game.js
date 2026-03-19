// game.js — game state, logic, stats, init, and event wiring
// Depends on: colorUtils.js, hashUtils.js, renderUtils.js, render.js

// ─── State ────────────────────────────────────────────────────────────────────

const STATE = {
  puzzle: null,          // from generatePuzzle
  guesses: [],           // [{units: {colorName: count}, mixedHex, mixedOklab, pct}]
  currentUnits: {},      // colorName → count (in-progress guess)
  won: false,
  lost: false,
};

const MAX_GUESSES = 6;

// ─── Game Logic ───────────────────────────────────────────────────────────────

function totalSelected() {
  return Object.values(STATE.currentUnits).reduce((s, n) => s + n, 0);
}

function updateUnitCount(colorName, delta) {
  const current = STATE.currentUnits[colorName] || 0;
  const next = current + delta;
  if (next < 0) return;
  if (totalSelected() + delta > STATE.puzzle.totalUnits) return;
  STATE.currentUnits[colorName] = next;
  renderPalette();
  renderUnitCounter();
  renderSubmitBtn();
}

function isDuplicateGuess(units) {
  return STATE.guesses.some(g => {
    const keys = new Set([...Object.keys(g.units), ...Object.keys(units)]);
    for (const k of keys) {
      if ((g.units[k] || 0) !== (units[k] || 0)) return false;
    }
    return true;
  });
}

function submitGuess() {
  const units = { ...STATE.currentUnits };

  if (totalSelected() !== STATE.puzzle.totalUnits) return;
  if (isDuplicateGuess(units)) {
    showToast('Already tried that mix!');
    return;
  }

  const colorUnitsForMix = STATE.puzzle.availableColors
    .filter(c => units[c.name])
    .map(c => ({ oklab: c.oklab, units: units[c.name] }));

  const mixedOklab = mixColors(colorUnitsForMix);
  const mixedHex = oklabToHex(mixedOklab.L, mixedOklab.a, mixedOklab.b);
  const pct = closeness(mixedOklab, STATE.puzzle.targetOklab);

  STATE.guesses.push({ units, mixedHex, mixedOklab, pct });

  if (pct === 100) {
    STATE.won = true;
    saveStats(true);
  } else if (STATE.guesses.length >= MAX_GUESSES) {
    STATE.lost = true;
    saveStats(false);
  }

  STATE.currentUnits = {};

  renderGuessHistory();
  renderPalette();
  renderUnitCounter();
  renderSubmitBtn();

  if (STATE.won || STATE.lost) setTimeout(showResultModal, 600);
}

// ─── Stats (localStorage) ─────────────────────────────────────────────────────

function loadStats() {
  try {
    return JSON.parse(localStorage.getItem('colorMixStats')) || {};
  } catch {
    return {};
  }
}

function saveStats(won) {
  const today = new Date().toISOString().slice(0, 10);
  const s = loadStats();
  if (s.lastDate === today) return;

  s.gamesPlayed = (s.gamesPlayed || 0) + 1;
  if (won) {
    s.wins = (s.wins || 0) + 1;
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    s.currentStreak = s.lastDate === yesterday ? (s.currentStreak || 0) + 1 : 1;
    s.maxStreak = Math.max(s.maxStreak || 0, s.currentStreak);
  } else {
    s.currentStreak = 0;
  }
  s.lastDate = today;
  localStorage.setItem('colorMixStats', JSON.stringify(s));
}

// ─── Init ─────────────────────────────────────────────────────────────────────

function init() {
  STATE.puzzle = generatePuzzle(new Date());

  renderTargetSwatch();
  renderPalette();
  renderUnitCounter();
  renderSubmitBtn();
  renderStreak();

  document.getElementById('submit-btn').addEventListener('click', submitGuess);

  document.getElementById('modal-close').addEventListener('click', () => {
    document.getElementById('result-modal').classList.remove('show');
  });

  document.getElementById('share-btn').addEventListener('click', () => {
    const text = buildShareText();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => showToast('Copied!'));
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Copied!');
    }
  });
}

document.addEventListener('DOMContentLoaded', init);

// ─── Service Worker ───────────────────────────────────────────────────────────

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
