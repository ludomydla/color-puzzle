// render.js — DOM rendering functions
// Depends on: STATE, MAX_GUESSES (game.js), updateUnitCount (game.js),
//             loadStats (game.js), renderUtils.js

function renderTargetSwatch() {
  document.getElementById('target-swatch').style.backgroundColor = STATE.puzzle.targetHex;
}

function renderPalette() {
  const container = document.getElementById('palette');
  container.innerHTML = '';
  for (const color of STATE.puzzle.availableColors) {
    const count = STATE.currentUnits[color.name] || 0;
    const card = document.createElement('div');
    card.className = `color-card${count > 0 ? ' active' : ''}`;

    card.innerHTML = `
      <div class="swatch" style="background-color:${color.hex}"></div>
      <div class="color-name">${color.name}</div>
      <div class="unit-controls">
        <button class="unit-btn minus" data-color="${color.name}" aria-label="Remove unit">−</button>
        <span class="unit-count">${count}</span>
        <button class="unit-btn plus" data-color="${color.name}" aria-label="Add unit">+</button>
      </div>
    `;
    container.appendChild(card);
  }

  container.querySelectorAll('.unit-btn.plus').forEach(btn => {
    btn.addEventListener('click', () => updateUnitCount(btn.dataset.color, 1));
  });
  container.querySelectorAll('.unit-btn.minus').forEach(btn => {
    btn.addEventListener('click', () => updateUnitCount(btn.dataset.color, -1));
  });
}

function renderUnitCounter() {
  document.getElementById('unit-counter').textContent =
    `${totalSelected()} / ${STATE.puzzle.totalUnits} units`;
}

function renderSubmitBtn() {
  const ready = totalSelected() === STATE.puzzle.totalUnits && !STATE.won && !STATE.lost;
  document.getElementById('submit-btn').disabled = !ready;
}

function renderGuessHistory() {
  const container = document.getElementById('guess-history');
  container.innerHTML = '';

  for (let i = 0; i < STATE.guesses.length; i++) {
    const g = STATE.guesses[i];
    const row = document.createElement('div');
    row.className = 'guess-row';

    const breakdown = STATE.puzzle.availableColors
      .filter(c => g.units[c.name])
      .map(c => `${g.units[c.name]}× ${c.name}`)
      .join(', ');

    row.innerHTML = `
      <div class="guess-swatches">
        <div class="guess-swatch" style="background-color:${g.mixedHex}" title="Your mix"></div>
        <div class="guess-swatch target-mini" style="background-color:${STATE.puzzle.targetHex}" title="Target"></div>
      </div>
      <div class="guess-info">
        <span class="guess-pct${g.pct === 100 ? ' exact' : ''}">${g.pct}%</span>
        <span class="guess-breakdown">${breakdown}</span>
      </div>
    `;
    row.style.animationDelay = `${i * 0.05}s`;
    container.appendChild(row);
  }
}

function renderStreak() {
  const s = loadStats();
  const el = document.getElementById('streak');
  if (s.currentStreak > 1) el.textContent = `🔥 ${s.currentStreak}`;
}

function showResultModal() {
  const modal = document.getElementById('result-modal');
  document.getElementById('modal-title').textContent = STATE.won ? 'Nice mix! 🎨' : 'Out of attempts';

  const s = loadStats();
  const recipeLines = Object.entries(STATE.puzzle.recipe)
    .map(([name, units]) => `${units}× ${name}`)
    .join(', ');

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-swatches">
      <div class="modal-swatch" style="background-color:${STATE.puzzle.targetHex}"></div>
    </div>
    <p class="modal-recipe">Recipe: ${recipeLines}</p>
    <div class="modal-stats">
      <div><strong>${s.gamesPlayed || 0}</strong><span>Played</span></div>
      <div><strong>${s.wins || 0}</strong><span>Wins</span></div>
      <div><strong>${s.currentStreak || 0}</strong><span>Streak</span></div>
      <div><strong>${s.maxStreak || 0}</strong><span>Best</span></div>
    </div>
  `;

  modal.classList.add('show');
}
