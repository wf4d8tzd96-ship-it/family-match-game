(() => {
const {
  BOARD_SIZE: LINK_SIZE,
  keyOf: linkKeyOf,
  wait: linkWait,
  shuffle: linkShuffle,
} = window.FamilyUtils;
const { AVATARS } = window.FamilyAvatars;

const LINK_MOVES = 60;
const LINK_SCORE = 10;
const LINK_CLEAR_DELAY = 520;
const LINK_PATH_DELAY = 260;

class LinkGame {
  constructor(context) {
    this.context = context;
    this.state = {
      board: [],
      score: 0,
      moves: LINK_MOVES,
      selected: null,
      locked: false,
      gameOver: false,
      effects: new Map(),
      scorePopups: [],
      path: [],
      combo: 0,
    };
  }

  start() {
    this.state.score = 0;
    this.state.moves = LINK_MOVES;
    this.state.selected = null;
    this.state.locked = false;
    this.state.gameOver = false;
    this.state.effects.clear();
    this.state.scorePopups = [];
    this.state.path = [];
    this.state.combo = 0;
    this.initBoard();
    this.render();
  }

  destroy() {
    this.state.locked = true;
  }

  render() {
    this.context.render({
      board: this.state.board,
      selected: this.state.selected,
      effects: this.state.effects,
      scorePopups: this.state.scorePopups,
      path: this.state.path,
      onTileClick: (row, col) => this.handleTileClick(row, col),
    });
    this.context.updateStatus({
      score: this.state.score,
      counterLabel: "步数",
      counterValue: this.state.moves,
      note: "连连看：相同头像最多转弯 2 次可消除，边线可绕外圈。",
    });
  }

  initBoard() {
    let attempts = 0;
    do {
      const pool = [];
      let avatarIndex = 0;
      while (pool.length < LINK_SIZE * LINK_SIZE - 1) {
        const id = AVATARS[avatarIndex % AVATARS.length].id;
        pool.push(id, id);
        avatarIndex += 1;
      }
      pool.length = LINK_SIZE * LINK_SIZE - 1;
      pool.push(null);
      const shuffled = linkShuffle(pool);
      this.state.board = Array.from({ length: LINK_SIZE }, (_, row) =>
        shuffled.slice(row * LINK_SIZE, row * LINK_SIZE + LINK_SIZE)
      );
      attempts += 1;
    } while (!this.hasAvailablePair() && attempts < 60);
  }

  async handleTileClick(row, col) {
    if (this.state.locked || this.state.gameOver || !this.state.board[row][col]) return;

    if (!this.state.selected) {
      this.state.selected = { row, col };
      this.render();
      return;
    }

    const first = this.state.selected;
    if (first.row === row && first.col === col) {
      this.state.selected = null;
      this.render();
      return;
    }

    const firstId = this.state.board[first.row][first.col];
    const secondId = this.state.board[row][col];
    if (firstId !== secondId) {
      this.state.combo = 0;
      this.setEffects([first, { row, col }], "shake");
      this.state.selected = { row, col };
      this.render();
      await linkWait(240);
      this.clearEffects();
      this.render();
      return;
    }

    const path = this.canConnect(first, { row, col });
    if (!path) {
      this.state.combo = 0;
      this.setEffects([first, { row, col }], "shake");
      this.render();
      await linkWait(240);
      this.clearEffects();
      this.state.selected = { row, col };
      this.render();
      return;
    }

    await this.matchAndRemove(first, { row, col }, path);
  }

  async matchAndRemove(a, b, path) {
    this.state.locked = true;
    this.state.selected = null;
    this.state.combo += 1;
    this.state.moves -= 1;
    this.state.path = path;
    this.render();
    this.context.playClearSound(Math.min(this.state.combo, 3), 1);
    await linkWait(LINK_PATH_DELAY);

    const value = LINK_SCORE;
    const anchor = { row: Math.round((a.row + b.row) / 2), col: Math.round((a.col + b.col) / 2) };
    this.state.score += value;
    this.state.scorePopups = [
      {
        ...anchor,
        value,
        chain: this.state.combo,
        multiplier: this.state.combo,
      },
    ];
    this.setEffects([a, b], "matching");
    this.render();
    await linkWait(LINK_CLEAR_DELAY);

    this.state.board[a.row][a.col] = null;
    this.state.board[b.row][b.col] = null;
    this.state.path = [];
    this.state.scorePopups = [];
    this.clearEffects();

    if (this.isCleared()) {
      this.render();
      this.endGame("通关成功");
      return;
    }

    if (this.state.moves <= 0) {
      this.render();
      this.endGame("步数用完");
      return;
    }

    if (!this.hasAvailablePair()) {
      this.shuffleRemaining();
    }

    this.state.locked = false;
    this.render();
  }

  canConnect(a, b) {
    if (this.state.board[a.row][a.col] !== this.state.board[b.row][b.col]) return null;
    return this.findPath(a, b);
  }

  findPath(start, target) {
    const directions = [
      { row: -1, col: 0, name: "up" },
      { row: 1, col: 0, name: "down" },
      { row: 0, col: -1, name: "left" },
      { row: 0, col: 1, name: "right" },
    ];
    const queue = [{ ...start, direction: null, turns: 0, id: `${start.row},${start.col},start,0` }];
    const parents = new Map();
    const visited = new Set([queue[0].id]);

    while (queue.length) {
      const current = queue.shift();
      if (current.row === target.row && current.col === target.col) {
        return this.reconstructPath(current.id, parents);
      }

      directions.forEach((direction) => {
        const next = {
          row: current.row + direction.row,
          col: current.col + direction.col,
          direction: direction.name,
          turns: current.direction && current.direction !== direction.name ? current.turns + 1 : current.turns,
        };
        if (next.turns > 2 || !this.isInPathBounds(next) || !this.isPassable(next, target)) return;
        const id = `${next.row},${next.col},${next.direction},${next.turns}`;
        if (visited.has(id)) return;
        visited.add(id);
        parents.set(id, current.id);
        queue.push({ ...next, id });
      });
    }
    return null;
  }

  reconstructPath(endId, parents) {
    const raw = [];
    let id = endId;
    while (id) {
      const [row, col] = id.split(",");
      raw.push({ row: Number(row), col: Number(col) });
      id = parents.get(id);
    }
    const points = raw.reverse();
    if (points.length <= 2) return points;
    const compressed = [points[0]];
    for (let index = 1; index < points.length - 1; index += 1) {
      const prev = points[index - 1];
      const current = points[index];
      const next = points[index + 1];
      const sameLine = (prev.row === current.row && current.row === next.row) || (prev.col === current.col && current.col === next.col);
      if (!sameLine) compressed.push(current);
    }
    compressed.push(points[points.length - 1]);
    return compressed;
  }

  isInPathBounds(point) {
    return point.row >= -1 && point.row <= LINK_SIZE && point.col >= -1 && point.col <= LINK_SIZE;
  }

  isVisiblePoint(point) {
    return point.row >= 0 && point.row < LINK_SIZE && point.col >= 0 && point.col < LINK_SIZE;
  }

  isPassable(point, target) {
    if (!this.isVisiblePoint(point)) return true;
    if (point.row === target.row && point.col === target.col) return true;
    return !this.state.board[point.row][point.col];
  }

  hasAvailablePair() {
    const positionsById = new Map();
    for (let row = 0; row < LINK_SIZE; row += 1) {
      for (let col = 0; col < LINK_SIZE; col += 1) {
        const id = this.state.board[row][col];
        if (!id) continue;
        if (!positionsById.has(id)) positionsById.set(id, []);
        positionsById.get(id).push({ row, col });
      }
    }

    for (const positions of positionsById.values()) {
      for (let first = 0; first < positions.length; first += 1) {
        for (let second = first + 1; second < positions.length; second += 1) {
          if (this.canConnect(positions[first], positions[second])) return true;
        }
      }
    }
    return false;
  }

  shuffleRemaining() {
    const remaining = [];
    let emptyCount = 0;
    this.state.board.forEach((row) => {
      row.forEach((id) => {
        if (id) remaining.push(id);
        else emptyCount += 1;
      });
    });
    let attempts = 0;
    do {
      const pool = [...linkShuffle(remaining), ...Array(emptyCount).fill(null)];
      this.state.board = Array.from({ length: LINK_SIZE }, (_, row) =>
        pool.slice(row * LINK_SIZE, row * LINK_SIZE + LINK_SIZE)
      );
      attempts += 1;
    } while (!this.hasAvailablePair() && attempts < 40);
  }

  isCleared() {
    return this.state.board.every((row) => row.every((id) => !id));
  }

  setEffects(cells, effect) {
    this.state.effects.clear();
    cells.forEach((cell) => this.state.effects.set(linkKeyOf(cell.row, cell.col), effect));
  }

  clearEffects() {
    this.state.effects.clear();
  }

  endGame(title) {
    this.state.gameOver = true;
    this.context.endGame({
      title,
      score: this.state.score,
    });
  }
}

window.LinkGame = LinkGame;
})();
