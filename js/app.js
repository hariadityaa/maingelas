(function () {
  "use strict";

  const STORAGE_KEY = "picolo:players";

  const CATEGORY_META = {
    drink: { label: "Drink", color: "var(--cat-drink)" },
    give: { label: "Give", color: "var(--cat-give)" },
    group: { label: "Group", color: "var(--cat-group)" },
    category: { label: "Category", color: "var(--cat-category)" },
    neverhave: { label: "Never Have I Ever", color: "var(--cat-neverhave)" },
    rule: { label: "New Rule", color: "var(--cat-rule)" },
    dare: { label: "Dare", color: "var(--cat-dare)" },
    special: { label: "Special", color: "var(--cat-special)" },
    versus: { label: "Versus", color: "var(--cat-versus)" },
  };

  const screens = {
    setup: document.getElementById("screen-setup"),
    game: document.getElementById("screen-game"),
    end: document.getElementById("screen-end"),
  };

  const playerForm = document.getElementById("player-form");
  const playerInput = document.getElementById("player-name-input");
  const playerList = document.getElementById("player-list");
  const playerHint = document.getElementById("player-hint");
  const startGameBtn = document.getElementById("start-game-btn");

  const menuBtn = document.getElementById("menu-btn");
  const nextBtn = document.getElementById("next-btn");
  const cardEl = document.getElementById("question-card");
  const cardTextEl = document.getElementById("card-text");
  const cardCategoryEl = document.getElementById("card-category");
  const progressFill = document.getElementById("progress-fill");
  const deckCountEl = document.getElementById("deck-count");

  const reshuffleBtn = document.getElementById("reshuffle-btn");
  const backToSetupBtn = document.getElementById("back-to-setup-btn");

  /** @type {string[]} */
  let players = [];
  let deck = [];
  let deckIndex = -1;
  let lastUsedPlayer = null;

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  // ---------------- Player setup ----------------

  function loadPlayers() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) players = parsed.filter((p) => typeof p === "string");
      }
    } catch (e) {
      players = [];
    }
  }

  function savePlayers() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(players));
    } catch (e) {
      /* ignore quota / privacy-mode errors */
    }
  }

  function renderPlayers() {
    playerList.innerHTML = "";
    players.forEach((name, i) => {
      const li = document.createElement("li");
      li.className = "player-chip";
      const span = document.createElement("span");
      span.textContent = name;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "remove-player";
      btn.setAttribute("aria-label", "Remove " + name);
      btn.textContent = "✕";
      btn.addEventListener("click", () => {
        players.splice(i, 1);
        savePlayers();
        renderPlayers();
      });
      li.appendChild(span);
      li.appendChild(btn);
      playerList.appendChild(li);
    });

    const enough = players.length >= 2;
    startGameBtn.disabled = !enough;
    if (players.length === 0) {
      playerHint.textContent = "Add at least 2 players to start.";
      playerHint.classList.remove("hint-ok");
    } else if (!enough) {
      playerHint.textContent = "Add at least one more player.";
      playerHint.classList.remove("hint-ok");
    } else {
      playerHint.textContent = players.length + " players ready.";
      playerHint.classList.add("hint-ok");
    }
  }

  function addPlayer(rawName) {
    const name = rawName.trim();
    if (!name) return;
    if (players.some((p) => p.toLowerCase() === name.toLowerCase())) {
      playerInput.value = "";
      return;
    }
    players.push(name);
    savePlayers();
    renderPlayers();
    playerInput.value = "";
    playerInput.focus();
  }

  playerForm.addEventListener("submit", (e) => {
    e.preventDefault();
    addPlayer(playerInput.value);
  });

  startGameBtn.addEventListener("click", () => {
    if (players.length < 2) return;
    startGame();
  });

  // ---------------- Deck / game logic ----------------

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function pickPlayer(exclude) {
    let pool = players;
    if (players.length > 1 && exclude) {
      pool = players.filter((p) => p !== exclude);
    }
    const choice = pool[Math.floor(Math.random() * pool.length)];
    return choice;
  }

  function fillTemplate(text, playersNeeded) {
    let result = text;
    if (playersNeeded >= 1 && result.includes("{player}")) {
      const p1 = pickPlayer(lastUsedPlayer);
      lastUsedPlayer = p1;
      result = result.split("{player}").join(p1);
    }
    if (playersNeeded >= 2 && result.includes("{player2}")) {
      const p2 = pickPlayer(lastUsedPlayer);
      result = result.split("{player2}").join(p2);
    }
    return result;
  }

  function startGame() {
    deck = shuffle(PICOLO_QUESTIONS);
    deckIndex = -1;
    lastUsedPlayer = null;
    updateProgress();
    cardCategoryEl.textContent = "READY";
    cardEl.style.setProperty("--card-color", "var(--accent-2)");
    cardTextEl.innerHTML = "Tap “Deal First Card” to begin.";
    nextBtn.textContent = "Deal First Card";
    showScreen("game");
  }

  function updateProgress() {
    const total = deck.length;
    const dealt = deckIndex + 1;
    const pct = total ? Math.min(100, (dealt / total) * 100) : 0;
    progressFill.style.width = pct + "%";
    deckCountEl.textContent = Math.max(total - dealt, 0) + " left";
  }

  function dealNext() {
    deckIndex++;
    if (deckIndex >= deck.length) {
      showScreen("end");
      return;
    }

    const q = deck[deckIndex];
    const meta = CATEGORY_META[q.category] || { label: "Card", color: "var(--accent-2)" };
    const text = fillTemplate(q.text, q.players || 0);

    cardCategoryEl.textContent = meta.label.toUpperCase();
    cardEl.style.setProperty("--card-color", meta.color);
    cardTextEl.textContent = text;
    nextBtn.textContent = "Next Card";

    cardEl.classList.remove("deal-in");
    // force reflow to restart animation
    void cardEl.offsetWidth;
    cardEl.classList.add("deal-in");

    updateProgress();
  }

  nextBtn.addEventListener("click", dealNext);

  menuBtn.addEventListener("click", () => {
    showScreen("setup");
  });

  reshuffleBtn.addEventListener("click", () => {
    startGame();
  });

  backToSetupBtn.addEventListener("click", () => {
    showScreen("setup");
  });

  // ---------------- Init ----------------

  loadPlayers();
  renderPlayers();
  showScreen("setup");
})();
