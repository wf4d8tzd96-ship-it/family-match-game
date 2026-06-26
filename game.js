(() => {
const boardEl = document.getElementById("board");
const legendEl = document.getElementById("legend");
const scoreEl = document.getElementById("score");
const movesEl = document.getElementById("moves");
const counterLabelEl = document.getElementById("counterLabel");
const finalScoreEl = document.getElementById("finalScore");
const gameOverModal = document.getElementById("gameOverModal");
const gameOverTitle = document.getElementById("gameOverTitle");
const restartButton = document.getElementById("restartButton");
const modalRestartButton = document.getElementById("modalRestartButton");
const soundButton = document.getElementById("soundButton");
const match3ModeButton = document.getElementById("match3ModeButton");
const linkModeButton = document.getElementById("linkModeButton");
const modeNoteEl = document.getElementById("modeNote");

let audioContext = null;

const appState = {
  mode: "match3",
  soundEnabled: true,
  activeGame: null,
};

const gameContext = {
  render(options) {
    window.FamilyBoard.renderBoard(boardEl, options);
  },
  updateStatus({ score, counterLabel, counterValue, note }) {
    scoreEl.textContent = score;
    counterLabelEl.textContent = counterLabel;
    movesEl.textContent = counterValue;
    modeNoteEl.textContent = note;
  },
  endGame({ title, score }) {
    gameOverTitle.textContent = title;
    finalScoreEl.textContent = score;
    gameOverModal.classList.remove("hidden");
  },
  playClearSound(chain, groupCount) {
    playClearSound(chain, groupCount);
  },
};

function setMode(mode) {
  if (appState.activeGame?.destroy) {
    appState.activeGame.destroy();
  }
  appState.mode = mode;
  gameOverModal.classList.add("hidden");
  match3ModeButton.classList.toggle("active", mode === "match3");
  linkModeButton.classList.toggle("active", mode === "link");
  match3ModeButton.setAttribute("aria-pressed", String(mode === "match3"));
  linkModeButton.setAttribute("aria-pressed", String(mode === "link"));

  appState.activeGame = mode === "match3" ? new window.Match3Game(gameContext) : new window.LinkGame(gameContext);
  appState.activeGame.start();
}

function restartCurrentMode() {
  gameOverModal.classList.add("hidden");
  appState.activeGame?.start();
}

function getAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
  return audioContext;
}

function playClearSound(chain, groupCount) {
  if (!appState.soundEnabled) return;
  const context = getAudioContext();
  const now = context.currentTime;
  const base = chain === 1 ? 523.25 : chain === 2 ? 659.25 : 783.99;
  const notes = [base, base * 1.25, base * 1.5 + groupCount * 12];
  notes.forEach((frequency, index) => {
    playTone(context, frequency, now + index * 0.075, 0.17, 0.08);
  });
}

function playTone(context, frequency, start, duration, volume) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 1.04, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.018);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function toggleSound() {
  appState.soundEnabled = !appState.soundEnabled;
  soundButton.textContent = appState.soundEnabled ? "音效：开" : "音效：关";
  soundButton.setAttribute("aria-pressed", String(appState.soundEnabled));
  if (appState.soundEnabled) {
    playClearSound(1, 1);
  }
}

restartButton.addEventListener("click", restartCurrentMode);
modalRestartButton.addEventListener("click", restartCurrentMode);
soundButton.addEventListener("click", toggleSound);
match3ModeButton.addEventListener("click", () => setMode("match3"));
linkModeButton.addEventListener("click", () => setMode("link"));

window.FamilyBoard.renderLegend(legendEl);
setMode("match3");
})();
