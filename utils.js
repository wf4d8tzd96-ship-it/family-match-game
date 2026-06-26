(() => {
const BOARD_SIZE = 9;

function keyOf(row, col) {
  return `${row}-${col}`;
}

function isInsideBoard(cell) {
  return cell.row >= 0 && cell.row < BOARD_SIZE && cell.col >= 0 && cell.col < BOARD_SIZE;
}

function isAdjacent(a, b) {
  return Math.abs(a.row - b.row) + Math.abs(a.col - b.col) === 1;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

window.FamilyUtils = {
  BOARD_SIZE,
  keyOf,
  isInsideBoard,
  isAdjacent,
  wait,
  shuffle,
};
})();
