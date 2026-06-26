(() => {
const { BOARD_SIZE, keyOf } = window.FamilyUtils;
const { AVATARS, avatarById, avatarMarkup } = window.FamilyAvatars;

function renderLegend(legendEl) {
  legendEl.innerHTML = AVATARS.map(
    (avatar) => `
      <div class="legend-item">
        <div class="legend-avatar">${avatarMarkup(avatar.id)}</div>
        <div>
          <span class="legend-name">${avatar.name}</span>
        </div>
      </div>`
  ).join("");
}

function renderBoard(boardEl, options) {
  const {
    board,
    selected,
    effects,
    scorePopups = [],
    path = [],
    onTileClick,
    onPointerDown,
    onPointerUp,
    onPointerCancel,
  } = options;

  boardEl.innerHTML = "";
  for (let row = 0; row < BOARD_SIZE; row += 1) {
    for (let col = 0; col < BOARD_SIZE; col += 1) {
      const id = board[row][col];
      const tile = document.createElement("button");
      tile.type = "button";
      tile.className = "tile";
      tile.dataset.row = row;
      tile.dataset.col = col;

      if (id) {
        const avatar = avatarById(id);
        tile.setAttribute("aria-label", `${avatar.name}，第${row + 1}行第${col + 1}列`);
        tile.innerHTML = avatarMarkup(id);
      } else {
        tile.classList.add("empty");
        tile.setAttribute("aria-label", `空格，第${row + 1}行第${col + 1}列`);
      }

      if (selected && selected.row === row && selected.col === col) {
        tile.classList.add("selected");
      }

      const effect = effects?.get(keyOf(row, col));
      if (effect) tile.classList.add(effect);

      if (id && onPointerDown) tile.addEventListener("pointerdown", (event) => onPointerDown(event, row, col));
      if (id && onPointerUp) tile.addEventListener("pointerup", (event) => onPointerUp(event, row, col));
      if (onPointerCancel) tile.addEventListener("pointercancel", onPointerCancel);
      if (id && onTileClick) tile.addEventListener("click", () => onTileClick(row, col));

      boardEl.appendChild(tile);
    }
  }

  renderPath(boardEl, path);
  renderScorePopups(boardEl, scorePopups);
}

function renderScorePopups(boardEl, scorePopups) {
  scorePopups.forEach((popup, index) => {
    const scorePopup = document.createElement("span");
    scorePopup.className = "score-popup";
    scorePopup.style.setProperty("--popup-left", `${((popup.col + 0.5) / BOARD_SIZE) * 100}%`);
    scorePopup.style.setProperty("--popup-top", `${((popup.row + 0.14) / BOARD_SIZE) * 100}%`);
    scorePopup.style.setProperty("--popup-offset", `${(index % 2) * 14}px`);
    scorePopup.textContent = `+${popup.value}`;
    if (popup.chain > 1) {
      const chainBadge = document.createElement("small");
      chainBadge.textContent = `x${popup.multiplier}`;
      scorePopup.appendChild(chainBadge);
    }
    boardEl.appendChild(scorePopup);
  });
}

function renderPath(boardEl, path) {
  if (!path || path.length < 2) return;
  const overlay = document.createElement("div");
  overlay.className = "link-path";
  for (let index = 0; index < path.length - 1; index += 1) {
    const from = path[index];
    const to = path[index + 1];
    const segment = document.createElement("span");
    segment.className = from.row === to.row ? "path-segment horizontal" : "path-segment vertical";
    const fromPoint = pointToPercent(from);
    const toPoint = pointToPercent(to);

    const left = Math.min(fromPoint.x, toPoint.x);
    const top = Math.min(fromPoint.y, toPoint.y);
    const width = Math.abs(fromPoint.x - toPoint.x);
    const height = Math.abs(fromPoint.y - toPoint.y);

    segment.style.left = `${left}%`;
    segment.style.top = `${top}%`;
    segment.style.width = from.row === to.row ? `${width}%` : "4px";
    segment.style.height = from.col === to.col ? `${height}%` : "4px";
    overlay.appendChild(segment);
  }
  boardEl.appendChild(overlay);
}

function pointToPercent(point) {
  return {
    x: axisToPercent(point.col),
    y: axisToPercent(point.row),
  };
}

function axisToPercent(value) {
  if (value < 0) return 0;
  if (value >= BOARD_SIZE) return 100;
  return ((value + 0.5) / BOARD_SIZE) * 100;
}

window.FamilyBoard = {
  renderLegend,
  renderBoard,
};
})();
