const produceEmojis = [
  { emoji: "🍎", base: "Elma" },
  { emoji: "🍐", base: "Armut" },
  { emoji: "🍊", base: "Portakal" },
  { emoji: "🍋", base: "Limon" },
  { emoji: "🍌", base: "Muz" },
  { emoji: "🍉", base: "Karpuz" },
  { emoji: "🍇", base: "Uzum" },
  { emoji: "🍓", base: "Cilek" },
  { emoji: "🫐", base: "Yaban Mersini" },
  { emoji: "🍒", base: "Kiraz" },
  { emoji: "🍑", base: "Seftali" },
  { emoji: "🥭", base: "Mango" },
  { emoji: "🍍", base: "Ananas" },
  { emoji: "🥝", base: "Kivi" },
  { emoji: "🍅", base: "Domates" },
  { emoji: "🥕", base: "Havuc" },
  { emoji: "🌽", base: "Misir" },
  { emoji: "🥒", base: "Salatalik" },
  { emoji: "🥬", base: "Marul" },
  { emoji: "🥦", base: "Brokoli" },
  { emoji: "🧄", base: "Sarimsak" },
  { emoji: "🧅", base: "Sogan" },
  { emoji: "🍆", base: "Patlican" },
  { emoji: "🥔", base: "Patates" }
];

const nameSuffixes = [
  "Bahcesi", "Sepeti", "Yildizi", "Surprizi", "Gulusu", "Dansi",
  "Arkadasi", "Dunyasi", "Keyfi", "Nehri", "Sarkisi", "Bahari"
];

const paletteClasses = [
  "linear-gradient(135deg, #fff5af, #ffc3a7)",
  "linear-gradient(135deg, #b8f2e6, #fff1a8)",
  "linear-gradient(135deg, #ffd6e8, #ffd166)",
  "linear-gradient(135deg, #c9e4ff, #d9b8ff)",
  "linear-gradient(135deg, #ffe4b8, #bde7ff)",
  "linear-gradient(135deg, #c6f6d5, #fef3c7)"
];

const gameBoard = document.getElementById("gameBoard");
const boardSizeSelect = document.getElementById("boardSize");
const restartButton = document.getElementById("restartButton");
const moveCountElement = document.getElementById("moveCount");
const matchCountElement = document.getElementById("matchCount");
const statusTextElement = document.getElementById("statusText");
const helpModal = document.getElementById("helpModal");
const startGameButton = document.getElementById("startGameButton");
const openHelpButton = document.getElementById("openHelpButton");
const closeHelpButton = document.getElementById("closeHelpButton");
const closeHelpBackdrop = document.getElementById("closeHelpBackdrop");

let firstCard = null;
let secondCard = null;
let lockBoard = false;
let moves = 0;
let matches = 0;
let gridSize = 8;
let totalPairs = 32;
let audioContext;

function buildCardPool(pairCount) {
  const pool = [];

  for (let index = 0; index < pairCount; index += 1) {
    const produce = produceEmojis[index % produceEmojis.length];
    const suffix = nameSuffixes[Math.floor(index / produceEmojis.length)];
    pool.push({
      id: `${produce.base}-${suffix}`,
      emoji: produce.emoji,
      name: `${produce.base} ${suffix}`,
      background: paletteClasses[index % paletteClasses.length]
    });
  }

  return pool;
}

function shuffle(items) {
  const array = [...items];

  for (let index = array.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [array[index], array[swapIndex]] = [array[swapIndex], array[index]];
  }

  return array;
}

function setStatus(message) {
  statusTextElement.textContent = message;
}

function updateStats() {
  moveCountElement.textContent = String(moves);
  matchCountElement.textContent = `${matches}/${totalPairs}`;
}

function ensureAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
}

function playToneSequence(sequence, type = "sine") {
  ensureAudioContext();

  const now = audioContext.currentTime;
  const gain = audioContext.createGain();
  gain.connect(audioContext.destination);
  gain.gain.value = 0.0001;

  sequence.forEach((item, index) => {
    const osc = audioContext.createOscillator();
    const localGain = audioContext.createGain();
    const start = now + index * item.duration;
    const end = start + item.duration;

    osc.type = type;
    osc.frequency.setValueAtTime(item.frequency, start);
    localGain.gain.setValueAtTime(0.0001, start);
    localGain.gain.exponentialRampToValueAtTime(item.volume, start + 0.02);
    localGain.gain.exponentialRampToValueAtTime(0.0001, end);

    osc.connect(localGain);
    localGain.connect(gain);
    osc.start(start);
    osc.stop(end);
  });
}

function playMatchSound() {
  playToneSequence([
    { frequency: 659, duration: 0.16, volume: 0.09 },
    { frequency: 880, duration: 0.16, volume: 0.12 },
    { frequency: 988, duration: 0.2, volume: 0.13 }
  ], "triangle");
}

function playMismatchSound() {
  playToneSequence([
    { frequency: 280, duration: 0.16, volume: 0.11 },
    { frequency: 180, duration: 0.24, volume: 0.11 }
  ], "sawtooth");
}

function resetTurn() {
  firstCard = null;
  secondCard = null;
  lockBoard = false;
}

function finishGameIfNeeded() {
  if (matches === totalPairs) {
    setStatus("Bravo! Tum kartlari buldun");
    playToneSequence([
      { frequency: 523, duration: 0.18, volume: 0.09 },
      { frequency: 659, duration: 0.18, volume: 0.1 },
      { frequency: 784, duration: 0.18, volume: 0.11 },
      { frequency: 1047, duration: 0.28, volume: 0.13 }
    ], "triangle");
  }
}

function checkForMatch() {
  moves += 1;
  const isMatch = firstCard.dataset.pairId === secondCard.dataset.pairId;
  updateStats();

  if (isMatch) {
    firstCard.classList.add("is-matched");
    secondCard.classList.add("is-matched");
    firstCard.disabled = true;
    secondCard.disabled = true;
    matches += 1;
    updateStats();
    setStatus("Harika! Eslesen kartlar bulundu");
    playMatchSound();
    resetTurn();
    finishGameIfNeeded();
    return;
  }

  lockBoard = true;
  setStatus("Haydi tekrar dene");
  playMismatchSound();

  window.setTimeout(() => {
    firstCard.classList.remove("is-flipped");
    secondCard.classList.remove("is-flipped");
    resetTurn();
  }, 900);
}

function handleCardClick(event) {
  const card = event.currentTarget;

  if (lockBoard || card === firstCard || card.classList.contains("is-matched")) {
    return;
  }

  ensureAudioContext();
  card.classList.add("is-flipped");

  if (!firstCard) {
    firstCard = card;
    setStatus("Bir kart daha sec");
    return;
  }

  secondCard = card;
  checkForMatch();
}

function createCard(cardData) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "memory-card";
  button.dataset.pairId = cardData.id;
  button.setAttribute("aria-label", `${cardData.name} karti`);

  button.innerHTML = `
    <span class="memory-card__inner">
      <span class="memory-card__face memory-card__front"></span>
      <span class="memory-card__face memory-card__back" style="background:${cardData.background}">
        <span class="card-emoji">${cardData.emoji}</span>
        <span class="card-name">${cardData.name}</span>
      </span>
    </span>
  `;

  button.addEventListener("click", handleCardClick);
  return button;
}

function setupBoard(size) {
  gridSize = Number(size);
  totalPairs = (gridSize * gridSize) / 2;
  moves = 0;
  matches = 0;
  resetTurn();
  setStatus("Oyuna hazir");
  updateStats();

  const pairs = buildCardPool(totalPairs);
  const deck = shuffle([...pairs, ...pairs]);

  gameBoard.innerHTML = "";
  gameBoard.style.gridTemplateColumns = `repeat(${gridSize}, minmax(0, 1fr))`;

  deck.forEach((cardData) => {
    gameBoard.appendChild(createCard(cardData));
  });
}

function openHelpModal() {
  helpModal.classList.add("is-visible");
}

function closeHelpModal() {
  helpModal.classList.remove("is-visible");
}

boardSizeSelect.addEventListener("change", (event) => {
  setupBoard(event.target.value);
});

restartButton.addEventListener("click", () => {
  setupBoard(boardSizeSelect.value);
});

startGameButton.addEventListener("click", () => {
  closeHelpModal();
  setupBoard(boardSizeSelect.value);
});

openHelpButton.addEventListener("click", openHelpModal);
closeHelpButton.addEventListener("click", closeHelpModal);
closeHelpBackdrop.addEventListener("click", closeHelpModal);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeHelpModal();
  }
});

setupBoard(boardSizeSelect.value);
