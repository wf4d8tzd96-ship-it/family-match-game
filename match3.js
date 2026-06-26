(() => {
const {
  BOARD_SIZE: MATCH3_SIZE,
  keyOf: match3KeyOf,
  isInsideBoard: match3IsInsideBoard,
  isAdjacent: match3IsAdjacent,
  wait: match3Wait,
} = window.FamilyUtils;
const { randomAvatarId } = window.FamilyAvatars;

const INITIAL_MATCH3_MOVES = 30;
const CLEAR_DELAY = 820;
const DROP_DELAY = 430;
const SWIPE_THRESHOLD = 26;

class Match3Game {
  constructor(context) {
    this.context = context;
    this.state = {
      board: [],
      score: 0,
      moves: INITIAL_MATCH3_MOVES,
      selected: null,
      locked: false,
      gameOver: false,
      effects: new Map(),
      scorePopups: [],
      dragStart: null,
      suppressClick: false,
      lastFallingCells: [],
      lastNewCells: [],
    };
  }

  start() {
    this.state.score = 0;
    this.state.moves = INITIAL_MATCH3_MOVES;
    this.state.selected = null;
    this.state.locked = false;
    this.state.gameOver = false;
    this.state.effects.clear();
    this.state.scorePopups = [];
    this.initBoard();
    this.render();
  }

  render() {
    this.context.render({
      board: this.state.board,
      selected: this.state.selected,
      effects: this.state.effects,
      scorePopups: this.state.scorePopups,
      onTileClick: (row, col) => this.handleTileClick(row, col),
      onPointerDown: (event, row, col) => this.handlePointerDown(event, row, col),
      onPointerUp: (event, row, col) => this.handlePointerUp(event, row, col),
      onPointerCancel: () => {
        this.state.dragStart = null;
      },
    });
    this.context.updateStatus({
      score: this.state.score,
      counterLabel: "步数",
      counterValue: this.state.moves,
      note: "消消乐：点击相邻头像，或向上下左右滑动交换。",
    });
  }

  initBoard() {
    do {
      this.state.board = Array.from({ length: MATCH3_SIZE }, () => Array(MATCH3_SIZE).fill(null));
      for (let row = 0; row < MATCH3_SIZE; row += 1) {
        for (let col = 0; col < MATCH3_SIZE; col += 1) {
          let id = randomAvatarId();
          while (this.createsImmediateMatch(row, col, id)) {
            id = randomAvatarId();
          }
          this.state.board[row][col] = id;
        }
      }
    } while (!this.hasPossibleMove());
  }

  createsImmediateMatch(row, col, id) {
    const leftMatch = col >= 2 && this.state.board[row][col - 1] === id && this.state.board[row][col - 2] === id;
    const upMatch = row >= 2 && this.state.board[row - 1][col] === id && this.state.board[row - 2][col] === id;
    return leftMatch || upMatch;
  }

  handlePointerDown(event, row, col) {
    if (this.state.locked || this.state.gameOver) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    this.state.dragStart = {
      row,
      col,
      x: event.clientX,
      y: event.clientY,
    };
  }

  handlePointerUp(event, row, col) {
    if (!this.state.dragStart || this.state.locked || this.state.gameOver) return;
    const start = this.state.dragStart;
    this.state.dragStart = null;
    if (start.row !== row || start.col !== col) return;

    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_THRESHOLD) return;

    const target =
      Math.abs(dx) > Math.abs(dy)
        ? { row, col: col + Math.sign(dx) }
        : { row: row + Math.sign(dy), col };

    if (!match3IsInsideBoard(target)) return;

    this.state.suppressClick = true;
    this.state.selected = null;
    this.attemptSwap({ row, col }, target);
    window.setTimeout(() => {
      this.state.suppressClick = false;
    }, 0);
  }

  handleTileClick(row, col) {
    if (this.state.suppressClick || this.state.locked || this.state.gameOver) return;

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

    if (!match3IsAdjacent(first, { row, col })) {
      this.state.selected = { row, col };
      this.render();
      return;
    }

    this.attemptSwap(first, { row, col });
  }

  async attemptSwap(a, b) {
    this.state.locked = true;
    this.state.selected = null;
    this.swapCells(a, b);
    this.setEffects([a, b], "swap");
    this.render();
    await match3Wait(230);

    const matches = this.findMatches();
    if (matches.cells.size === 0) {
      this.swapCells(a, b);
      this.setEffects([a, b], "shake");
      this.state.scorePopups = [];
      this.render();
      await match3Wait(240);
      this.clearEffects();
      this.state.locked = false;
      this.render();
      return;
    }

    this.state.moves -= 1;
    this.clearEffects();
    this.state.scorePopups = [];
    await this.resolveMatches(matches, 1);
    this.ensurePlayableBoard();
    this.state.locked = false;
    this.render();

    if (this.state.moves <= 0) {
      this.endGame("游戏结束");
    }
  }

  swapCells(a, b) {
    const temp = this.state.board[a.row][a.col];
    this.state.board[a.row][a.col] = this.state.board[b.row][b.col];
    this.state.board[b.row][b.col] = temp;
  }

  findMatches() {
    const cells = new Map();
    const groups = [];

    for (let row = 0; row < MATCH3_SIZE; row += 1) {
      let start = 0;
      for (let col = 1; col <= MATCH3_SIZE; col += 1) {
        if (col < MATCH3_SIZE && this.state.board[row][col] === this.state.board[row][start]) continue;
        const length = col - start;
        if (this.state.board[row][start] && length >= 3) {
          const group = [];
          for (let c = start; c < col; c += 1) group.push({ row, col: c });
          groups.push(group);
          group.forEach((cell) => cells.set(match3KeyOf(cell.row, cell.col), cell));
        }
        start = col;
      }
    }

    for (let col = 0; col < MATCH3_SIZE; col += 1) {
      let start = 0;
      for (let row = 1; row <= MATCH3_SIZE; row += 1) {
        if (row < MATCH3_SIZE && this.state.board[row][col] === this.state.board[start][col]) continue;
        const length = row - start;
        if (this.state.board[start][col] && length >= 3) {
          const group = [];
          for (let r = start; r < row; r += 1) group.push({ row: r, col });
          groups.push(group);
          group.forEach((cell) => cells.set(match3KeyOf(cell.row, cell.col), cell));
        }
        start = row;
      }
    }

    return { cells, groups };
  }

  hasPossibleMove() {
    for (let row = 0; row < MATCH3_SIZE; row += 1) {
      for (let col = 0; col < MATCH3_SIZE; col += 1) {
        const right = { row, col: col + 1 };
        const down = { row: row + 1, col };
        if (col + 1 < MATCH3_SIZE && this.swapCreatesMatch({ row, col }, right)) return true;
        if (row + 1 < MATCH3_SIZE && this.swapCreatesMatch({ row, col }, down)) return true;
      }
    }
    return false;
  }

  swapCreatesMatch(a, b) {
    this.swapCells(a, b);
    const hasMatch = this.findMatches().cells.size > 0;
    this.swapCells(a, b);
    return hasMatch;
  }

  ensurePlayableBoard() {
    if (this.hasPossibleMove()) return;
    this.initBoard();
    this.state.effects.clear();
  }

  async resolveMatches(matches, chain) {
    let current = matches;
    let chainRound = chain;

    while (current.cells.size > 0) {
      const popups = this.addScore(current.groups, chainRound);
      this.setEffects(Array.from(current.cells.values()), "matching");
      this.state.scorePopups = popups;
      this.render();
      this.context.playClearSound(chainRound, current.groups.length);
      await match3Wait(CLEAR_DELAY);
      this.state.scorePopups = [];

      this.removeCells(current.cells);
      this.collapseColumns();
      this.markDropEffects();
      this.render();
      await match3Wait(DROP_DELAY);

      this.clearEffects();
      current = this.findMatches();
      chainRound += 1;
    }
  }

  addScore(groups, chain) {
    const multiplier = chain === 1 ? 1 : chain === 2 ? 1.2 : 1.5;
    const popups = groups.map((group) => {
      const baseScore = this.scoreForGroup(group.length);
      const value = Math.round(baseScore * multiplier);
      const anchor = group[Math.floor(group.length / 2)];
      return {
        row: anchor.row,
        col: anchor.col,
        value,
        chain,
        multiplier,
      };
    });
    this.state.score += popups.reduce((sum, popup) => sum + popup.value, 0);
    return popups;
  }

  scoreForGroup(length) {
    if (length === 3) return 30;
    if (length === 4) return 60;
    return 100;
  }

  removeCells(cells) {
    cells.forEach((cell) => {
      this.state.board[cell.row][cell.col] = null;
    });
  }

  collapseColumns() {
    const newCells = [];
    const fallingCells = [];

    for (let col = 0; col < MATCH3_SIZE; col += 1) {
      const remaining = [];
      for (let row = MATCH3_SIZE - 1; row >= 0; row -= 1) {
        if (this.state.board[row][col]) remaining.push(this.state.board[row][col]);
      }

      for (let row = MATCH3_SIZE - 1; row >= 0; row -= 1) {
        const next = remaining.shift();
        if (next) {
          if (this.state.board[row][col] !== next) fallingCells.push({ row, col });
          this.state.board[row][col] = next;
        } else {
          this.state.board[row][col] = randomAvatarId();
          newCells.push({ row, col });
        }
      }
    }

    this.state.lastFallingCells = fallingCells;
    this.state.lastNewCells = newCells;
  }

  markDropEffects() {
    this.clearEffects();
    this.state.lastFallingCells.forEach((cell) => this.state.effects.set(match3KeyOf(cell.row, cell.col), "falling"));
    this.state.lastNewCells.forEach((cell) => this.state.effects.set(match3KeyOf(cell.row, cell.col), "new"));
  }

  setEffects(cells, effect) {
    this.state.effects.clear();
    cells.forEach((cell) => this.state.effects.set(match3KeyOf(cell.row, cell.col), effect));
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

window.Match3Game = Match3Game;
})();
