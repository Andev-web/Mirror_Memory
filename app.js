const board = document.getElementById("board");
const selDifficulty = document.getElementById("difficulty");
const btnNew = document.getElementById("btnNew");
const btnPeek = document.getElementById("btnPeek");

const elTime = document.getElementById("time");
const elMoves = document.getElementById("moves");
const elMatches = document.getElementById("matches");
const elBest = document.getElementById("best");
const toast = document.getElementById("toast");

const BEST_KEY = "memory_hacker_best_v1";

const GLYPHS = [
  "1.svg",
  "2.svg",
  "3.svg",
  "4.svg",
  "5.svg",
  "6.svg",
  "7.svg",
  "8.svg",
  "9.svg",
  "10.svg",
  "11.svg",
  "12.svg",
  "13.svg",
  "14.svg",
  "15.svg",
  "16.svg",
  "17.svg",
  "18.svg",
  "19.svg",
  "20.svg",
  "21.svg",
  "22.svg",
  "23.svg",
  "24.svg",
];

const DIFFICULTIES = {
  easy: { rows: 3, cols: 4 },
  medium: { rows: 4, cols: 4 },
  hard: { rows: 4, cols: 6 },
};

let currentDifficulty = selDifficulty.value;

let deck = []; // array of glyphs length N*N
let first = null; // first flipped card element
let second = null; // second flipped card element
let lock = false; // prevent clicks while resolving
let moves = 0;
let matches = 0;
let started = false;
let startAt = 0;
let timerId = null;

init();

function init() {
  loadBest();

  selDifficulty.addEventListener("change", () => {
    currentDifficulty = selDifficulty.value;
    newGame();
  });

  btnNew.addEventListener("click", newGame);
  btnPeek.addEventListener("click", peekAll);

  currentDifficulty = selDifficulty.value;
  newGame();
}

function newGame() {
  stopTimer();
  started = false;
  moves = 0;
  matches = 0;
  first = null;
  second = null;
  lock = false;

  elMoves.textContent = String(moves);
  elMatches.textContent = String(matches);
  elTime.textContent = "00:00";
  toast.textContent = "";
  loadBest();

  const { rows, cols } = DIFFICULTIES[currentDifficulty];

  deck = buildDeck(rows, cols);
  renderBoard(rows, cols, deck);
}
function buildDeck(rows, cols) {
  const total = rows * cols; // 24
  const pairs = total / 2; // 12

  const picked = GLYPHS.slice(0, pairs);
  const deck = [...picked, ...picked];

  return shuffle(deck);
}

function renderBoard(rows, cols, deck) {
  board.innerHTML = "";
  board.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;

  deck.forEach((glyph, idx) => {
    const cell = document.createElement("div");
    cell.className = "card";
    cell.dataset.glyph = glyph;

    const btn = document.createElement("button");
    btn.type = "button";
    btn.addEventListener("click", () => onFlip(cell));

    const back = document.createElement("div");
    back.className = "face back";
    back.innerHTML = `<span class="mark">?</span>`;

    const front = document.createElement("div");
    front.className = "face front";
    front.innerHTML = `<img src="${glyph}" class="glyph">`;

    cell.appendChild(btn);
    cell.appendChild(back);
    cell.appendChild(front);
    board.appendChild(cell);
  });
}

function onFlip(cardEl) {
  if (lock) return;
  if (cardEl.classList.contains("is-matched")) return;
  if (cardEl === first) return;

  if (!started) startTimer();

  cardEl.classList.add("is-flipped");

  if (!first) {
    first = cardEl;
    setAria(cardEl, true);
    return;
  }

  second = cardEl;
  setAria(second, true);

  moves += 1;
  elMoves.textContent = String(moves);

  const a = first.dataset.glyph;
  const b = second.dataset.glyph;

  if (a === b) {
    // Match ✅
    first.classList.add("is-matched");
    second.classList.add("is-matched");

    matches += 1;
    elMatches.textContent = String(matches);

    resetPick();

    // Ganaste
    const { rows, cols } = DIFFICULTIES[currentDifficulty];

    if (matches === (rows * cols) / 2) {
      stopTimer();
      const seconds = Math.floor((Date.now() - startAt) / 1000);
      onWin(seconds, moves, `${rows}x${cols}`);
    }
  } else {
    // No match ❌
    lock = true;
    setTimeout(() => {
      first.classList.remove("is-flipped");
      second.classList.remove("is-flipped");
      setAria(first, false);
      setAria(second, false);
      resetPick();
      lock = false;
    }, 650);
  }
}

function resetPick() {
  first = null;
  second = null;
}

function setAria(cardEl, opened) {
  const btn = cardEl.querySelector("button");
  if (!btn) return;
  btn.setAttribute(
    "aria-label",
    opened ? `Carta: ${cardEl.dataset.glyph}` : "Carta oculta",
  );
}

function startTimer() {
  started = true;
  startAt = Date.now();
  timerId = setInterval(() => {
    const seconds = Math.floor((Date.now() - startAt) / 1000);
    elTime.textContent = formatTime(seconds);
  }, 250);
}

function stopTimer() {
  if (timerId) clearInterval(timerId);
  timerId = null;
}

function formatTime(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function shuffle(arr) {
  // Fisher-Yates
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function peekAll() {
  if (lock) return;
  const cards = [...board.querySelectorAll(".card")];
  cards.forEach((c) => {
    if (!c.classList.contains("is-matched")) c.classList.add("is-flipped");
  });

  lock = true;
  setTimeout(() => {
    cards.forEach((c) => {
      if (!c.classList.contains("is-matched")) c.classList.remove("is-flipped");
    });
    lock = false;
  }, 900);
}

function onWin(seconds, moves, difficultyKey) {
  toast.textContent = `✅ HACK COMPLETE — ${formatTime(seconds)} · ${moves} intentos · ${difficultyKey}`;
  const best = getBestFor(difficultyKey);

  const currentScore = computeScore(seconds, moves, difficultyKey);
  const bestScore = best?.score ?? -Infinity;

  if (currentScore > bestScore) {
    setBestFor(difficultyKey, { score: currentScore, seconds, moves });
    loadBest();
    toast.textContent += " · 🏆 ¡Nuevo récord!";
  }
}

function computeScore(seconds, moves, difficultyKey) {
  const [rows, cols] = difficultyKey.split("x").map(Number);
  const base = rows * cols * 100;
  const timePenalty = seconds * 2;
  const movePenalty = moves * 6;
  return Math.max(0, base - timePenalty - movePenalty);
}

function loadBest() {
  const data = safeParse(localStorage.getItem(BEST_KEY)) ?? {};
  const { rows, cols } = DIFFICULTIES[currentDifficulty];
  const key = `${rows}x${cols}`;
  const best = data[key];

  if (!best) {
    elBest.textContent = "—";
    return;
  }

  elBest.textContent = `${formatTime(best.seconds)} · ${best.moves} mov`;
}

function getBestFor(n) {
  const data = safeParse(localStorage.getItem(BEST_KEY)) ?? {};
  return data[String(n)] ?? null;
}

function setBestFor(n, payload) {
  const data = safeParse(localStorage.getItem(BEST_KEY)) ?? {};
  data[String(n)] = payload;
  localStorage.setItem(BEST_KEY, JSON.stringify(data));
}

function safeParse(str) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}
