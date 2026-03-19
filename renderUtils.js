// renderUtils.js — stateless rendering helpers
// Depends on: STATE, MAX_GUESSES (game.js)

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2000);
}

function pctToEmoji(pct) {
  if (pct === 100) return '🟩';
  if (pct >= 80)   return '🟨';
  if (pct >= 50)   return '🟧';
  return '🟥';
}

function buildShareText() {
  const today = new Date().toISOString().slice(0, 10);
  const grid = STATE.guesses.map(g => pctToEmoji(g.pct)).join('');
  const result = STATE.won ? `${STATE.guesses.length}/${MAX_GUESSES}` : `X/${MAX_GUESSES}`;
  return `Color Mix ${today} ${result}\n${grid}`;
}
