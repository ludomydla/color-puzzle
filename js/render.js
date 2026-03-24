// render.js — DOM rendering functions
// Depends on: STATE, MAX_GUESSES (game.js), addToSlot/removeFromSlot (game.js),
//             loadStats (game.js), renderUtils.js

function renderTargetSwatch() {
  document.getElementById('target-swatch').style.backgroundColor = STATE.puzzle.targetHex;
}

function renderPalette() {
  const container = document.getElementById('palette');
  const full = totalSelected() >= STATE.puzzle.totalUnits;
  container.innerHTML = '';

  for (const color of STATE.puzzle.availableColors) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = `palette-chip${full ? ' full' : ''}`;
    chip.disabled = full || STATE.won || STATE.lost;
    chip.setAttribute('aria-label', `Add ${color.name}`);
    chip.innerHTML = `
      <span class="palette-chip-swatch" style="background-color:${color.hex}"></span>
      <span class="palette-chip-name">${color.name}</span>
    `;
    chip.addEventListener('click', () => addToSlot(color.name));
    container.appendChild(chip);
  }
}

function renderCurrentGuess() {
  const container = document.getElementById('current-guess');
  container.innerHTML = '';
  const total = STATE.puzzle.totalUnits;

  for (let i = 0; i < total; i++) {
    const slot = document.createElement('button');
    slot.type = 'button';

    if (i < STATE.currentSlots.length) {
      const colorName = STATE.currentSlots[i];
      const color = STATE.puzzle.availableColors.find(c => c.name === colorName);
      slot.className = 'slot filled';
      slot.style.backgroundColor = color.hex;
      slot.setAttribute('aria-label', `Remove ${colorName}`);
      slot.addEventListener('click', () => removeFromSlot(i));
    } else {
      slot.className = 'slot empty';
      slot.disabled = true;
      slot.setAttribute('aria-label', 'Empty slot');
    }

    container.appendChild(slot);
  }
}

function renderUnitCounter() {
  document.getElementById('unit-counter').textContent =
    `${totalSelected()} / ${STATE.puzzle.totalUnits}`;
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

    // Build unit squares: one square per unit, ordered by availableColors
    const unitSquares = STATE.puzzle.availableColors
      .flatMap(c => Array(g.units[c.name] || 0).fill(
        `<span class="history-slot" style="background-color:${c.hex}"></span>`
      ))
      .join('');

    row.innerHTML = `
      <div class="guess-slots">${unitSquares}</div>
      <div class="guess-result">
        <div class="guess-swatches">
          <div class="guess-swatch" style="background-color:${g.mixedHex}" title="Your mix"></div>
          <div class="guess-swatch target-mini" style="background-color:${STATE.puzzle.targetHex}" title="Target"></div>
        </div>
        <span class="guess-pct${g.pct === 100 ? ' exact' : ''}">${g.pct}%</span>
      </div>
    `;
    row.style.animationDelay = `${i * 0.05}s`;
    container.appendChild(row);
  }
}

function animateUnitsToSwatch(rowEl) {
  const slots = [...rowEl.querySelectorAll('.history-slot')];
  const swatchEl = rowEl.querySelector('.guess-swatch');
  if (!swatchEl || !slots.length) return;

  // Cancel the row's CSS animation so getBoundingClientRect() returns stable coords
  rowEl.style.animation = 'none';

  const swatchRect = swatchEl.getBoundingClientRect();
  const targetX = swatchRect.left + swatchRect.width / 2;
  const swatchCenterY = swatchRect.top + swatchRect.height / 2;

  swatchEl.style.opacity = '0';
  swatchEl.style.transition = 'none';

  const stagger = 40;
  const duration = 350;

  const clones = slots.map(slot => {
    const rect = slot.getBoundingClientRect();
    const el = document.createElement('span');
    Object.assign(el.style, {
      position: 'fixed',
      left: `${rect.left}px`,
      top: `${swatchCenterY - rect.height / 2}px`,
      width: `${rect.width}px`,
      height: `${rect.height}px`,
      borderRadius: '4px',
      backgroundColor: getComputedStyle(slot).backgroundColor,
      opacity: '0.8',
      pointerEvents: 'none',
      zIndex: '9999',
    });
    document.body.appendChild(el);
    return { el, rect };
  });

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      clones.forEach(({ el, rect }, i) => {
        const dx = targetX - rect.left - rect.width / 2;
        el.style.transition = `transform ${duration}ms cubic-bezier(0.4,0,0.2,1) ${i * stagger}ms, opacity ${duration * 0.35}ms ease ${i * stagger + duration * 0.65}ms`;
        el.style.transform = `translateX(${dx}px)`;
        el.style.opacity = '0';
      });

      const totalTime = duration + (clones.length - 1) * stagger + 60;
      setTimeout(() => {
        clones.forEach(({ el }) => { el.remove(); });
        swatchEl.style.transition = 'opacity 0.22s ease';
        swatchEl.style.opacity = '1';
      }, totalTime);
    });
  });
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

  const recipeSquares = STATE.lost
    ? STATE.puzzle.availableColors
        .flatMap(c => Array(STATE.puzzle.recipe[c.name] || 0).fill(
          `<span class="history-slot" style="background-color:${c.hex}"></span>`
        ))
        .join('')
    : '';

  document.getElementById('modal-body').innerHTML = `
    <div class="modal-swatches">
      <div class="modal-swatch" style="background-color:${STATE.puzzle.targetHex}"></div>
    </div>
    ${STATE.lost ? `<div class="modal-recipe-slots">${recipeSquares}</div>` : ''}
    <div class="modal-stats">
      <div><strong>${s.gamesPlayed || 0}</strong><span>Played</span></div>
      <div><strong>${s.wins || 0}</strong><span>Wins</span></div>
      <div><strong>${s.currentStreak || 0}</strong><span>Streak</span></div>
      <div><strong>${s.maxStreak || 0}</strong><span>Best</span></div>
    </div>
  `;

  modal.classList.add('show');
}
