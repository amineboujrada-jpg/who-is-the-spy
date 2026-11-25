// Who Is The Spy : logique du jeu (pass & play, un seul téléphone).
(function () {
  'use strict';

  const EYE_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>';
  const HAT_SVG = '<svg class="mini" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 14c3-2 17-2 20 0"/><path d="M7 13V8h10v5"/></svg>';
  const PREFIX = 'wits-';
  const store = {
    get(k, d) {
      try { const v = localStorage.getItem(PREFIX + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; }
    },
    set(k, v) {
      try { localStorage.setItem(PREFIX + k, JSON.stringify(v)); } catch (e) {}
    }
  };

  const $ = (id) => document.getElementById(id);
  const screens = ['menu', 'reveal', 'discuss', 'vote', 'result'];

  const state = {
    players: store.get('players', 5),
    spies: store.get('spies', 1),
    timerMin: store.get('timer', 5),
    categories: store.get('categories', ['pays', 'objets', 'sports', 'lieux', 'animaux', 'vehicules']),
    sound: store.get('sound', true),
    vibe: store.get('vibe', true),
    lang: store.get('lang', null),
    theme: store.get('theme', 'dark'),
    // partie en cours
    word: '',
    category: '',
    roles: [],        // 'agent' | 'spy' par joueur
    revealIndex: 0,
    cardShown: false,
    timerId: null,
    remaining: 0,
    eliminated: null
  };

  // ---------- Langue et thème ----------
  function applyLang(lang) {
    currentLang = STRINGS[lang] ? lang : 'en';
    document.documentElement.lang = currentLang;
    document.documentElement.dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.querySelectorAll('[data-i]').forEach((el) => { el.textContent = t(el.dataset.i); });
    document.querySelectorAll('[data-i-aria]').forEach((el) => { el.setAttribute('aria-label', t(el.dataset.iAria)); });
    document.title = t('title');
    $('lang-select').value = currentLang;
    renderCategories();
    fillTimerSelect();
    $('timer-select').value = String(state.timerMin);
    $('players-val').textContent = state.players;
    $('spies-val').textContent = state.spies;
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
    else root.removeAttribute('data-theme');
  }

  // ---------- Écrans ----------
  function show(name) {
    screens.forEach((s) => $(s).classList.toggle('active', s === name));
    window.scrollTo(0, 0);
  }

  // ---------- Menu ----------
  function renderCategories() {
    const box = $('categories');
    box.textContent = '';
    CATEGORY_KEYS.forEach((key) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = t('cat_' + key);
      b.setAttribute('aria-pressed', String(state.categories.includes(key)));
      b.addEventListener('click', () => {
        const on = state.categories.includes(key);
        state.categories = on ? state.categories.filter((k) => k !== key) : state.categories.concat(key);
        store.set('categories', state.categories);
        b.setAttribute('aria-pressed', String(!on));
      });
      box.appendChild(b);
    });
  }

  function fillTimerSelect() {
    const sel = $('timer-select');
    sel.textContent = '';
    for (let m = 1; m <= 10; m++) {
      const o = document.createElement('option');
      o.value = String(m);
      o.textContent = m + ' min';
      sel.appendChild(o);
    }
  }

  function clampSpies() {
    const max = Math.max(1, Math.floor((state.players - 1) / 2));
    if (state.spies > max) state.spies = max;
    if (state.spies < 1) state.spies = 1;
  }

  function bindMenu() {
    $('players-minus').addEventListener('click', () => { state.players = Math.max(3, state.players - 1); clampSpies(); updateSteppers(); });
    $('players-plus').addEventListener('click', () => { state.players = Math.min(10, state.players + 1); updateSteppers(); });
    $('spies-minus').addEventListener('click', () => { state.spies = Math.max(1, state.spies - 1); updateSteppers(); });
    $('spies-plus').addEventListener('click', () => { state.spies = state.spies + 1; clampSpies(); updateSteppers(); });
    $('timer-select').addEventListener('change', (e) => { state.timerMin = Number(e.target.value); store.set('timer', state.timerMin); });
    $('btn-start').addEventListener('click', startGame);
    $('btn-settings').addEventListener('click', () => $('settings-dialog').showModal());
    $('btn-close-settings').addEventListener('click', () => $('settings-dialog').close());
  }

  function updateSteppers() {
    $('players-val').textContent = state.players;
    $('spies-val').textContent = state.spies;
    store.set('players', state.players);
    store.set('spies', state.spies);
  }

  // ---------- Partie ----------
  // Tirage sans répétition : on épuise la liste d'une catégorie avant de la recycler.
  function pickSecret() {
    const cat = state.categories[Math.floor(Math.random() * state.categories.length)];
    const list = wordsFor(currentLang, cat);
    const key = currentLang + ':' + cat;
    const used = store.get('used', {});
    let seen = Array.isArray(used[key]) ? used[key] : [];
    let pool = list.filter((w) => seen.indexOf(w) === -1);
    if (pool.length === 0) { seen = []; pool = list; }
    const word = pool[Math.floor(Math.random() * pool.length)];
    used[key] = seen.concat(word);
    store.set('used', used);
    return { cat, word };
  }

  function assignRoles() {
    const idx = [...Array(state.players).keys()];
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [idx[i], idx[j]] = [idx[j], idx[i]];
    }
    const roles = new Array(state.players).fill('agent');
    for (let i = 0; i < state.spies; i++) roles[idx[i]] = 'spy';
    return roles;
  }

  function startGame() {
    if (state.categories.length === 0) {
      $('menu-error').textContent = t('needCategory');
      $('menu-error').hidden = false;
      return;
    }
    $('menu-error').hidden = true;
    clampSpies();
    const secret = pickSecret();
    state.category = secret.cat;
    state.word = secret.word;
    state.roles = assignRoles();
    state.revealIndex = 0;
    state.cardShown = false;
    state.eliminated = null;
    showNextCard();
  }

  function showNextCard() {
    state.cardShown = false;
    $('flip').classList.remove('flipped');
    $('btn-hide').hidden = true;
    $('btn-show').hidden = false;
    const pass = $('reveal-pass');
    pass.textContent = t('passLabel');
    const big = document.createElement('strong');
    big.textContent = t('player', { n: state.revealIndex + 1 });
    pass.appendChild(big);
    const eyeBtn = $('btn-show');
    eyeBtn.textContent = '';
    eyeBtn.insertAdjacentHTML('beforeend', EYE_SVG);
    const eyeText = document.createElement('span');
    eyeText.textContent = t('showCard');
    eyeBtn.appendChild(eyeText);
    show('reveal');
  }

  function showCard() {
    const role = state.roles[state.revealIndex];
    const card = $('secret-card');
    const word = $('secret-word');
    $('flip').classList.add('flipped');
    card.classList.toggle('spy-card', role === 'spy');
    $('secret-label').textContent = t('player', { n: state.revealIndex + 1 });
    if (role === 'spy') {
      word.textContent = '';
      word.insertAdjacentHTML('beforeend', HAT_SVG);
      word.appendChild(document.createTextNode(' ' + t('youAreSpy')));
      word.className = 'secret-word spy';
      $('secret-hint').textContent = t('spyHint');
    } else {
      word.textContent = state.word;
      word.className = 'secret-word';
      $('secret-hint').textContent = t('yourWord');
    }
    $('btn-show').hidden = true;
    $('btn-hide').hidden = false;
    $('btn-hide').textContent = t('hideCard');
    feedback('tap');
  }

  function hideCardAndNext() {
    state.revealIndex++;
    if (state.revealIndex >= state.players) {
      startDiscussion();
    } else {
      showNextCard();
    }
  }

  function startDiscussion() {
    show('discuss');
    state.remaining = state.timerMin * 60;
    renderTimer();
    clearInterval(state.timerId);
    state.timerId = setInterval(() => {
      state.remaining--;
      renderTimer();
      if (state.remaining <= 0) {
        clearInterval(state.timerId);
        feedback('end');
        startVote();
      }
    }, 1000);
  }

  function renderTimer() {
    const m = Math.floor(Math.max(0, state.remaining) / 60);
    const s = Math.max(0, state.remaining) % 60;
    $('timer-display').textContent = String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  }

  function startVote() {
    clearInterval(state.timerId);
    const list = $('vote-list');
    list.textContent = '';
    for (let i = 0; i < state.players; i++) {
      const li = document.createElement('li');
      const who = document.createElement('span');
      who.className = 'who';
      const av = document.createElement('span');
      av.className = 'avatar';
      av.textContent = String(i + 1);
      const name = document.createElement('span');
      name.textContent = t('player', { n: i + 1 });
      who.appendChild(av);
      who.appendChild(name);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'secondary';
      btn.textContent = t('vote');
      btn.addEventListener('click', () => eliminate(i));
      li.appendChild(who);
      li.appendChild(btn);
      list.appendChild(li);
    }
    show('vote');
  }

  function eliminate(i) {
    state.eliminated = i;
    const spyCaught = state.roles[i] === 'spy';
    const spiesLeft = state.roles.filter((r, idx) => r === 'spy' && idx !== i).length;
    const agentsWin = spyCaught && spiesLeft === 0;

    $('result-title').textContent = agentsWin ? t('agentsWin') : t('spiesWin');
    $('result-banner').className = 'result-banner ' + (agentsWin ? 'agents' : 'spies');
    $('result-detail').textContent = t('eliminated', { name: t('player', { n: i + 1 }) }) + ' — ' +
      (spyCaught ? t('wasSpy') : t('wasAgent'));
    $('result-word-k').textContent = t('wordKey');
    $('result-spies-k').textContent = t('spiesKey');
    $('result-word').textContent = state.word;
    const spyNames = state.roles
      .map((r, idx) => (r === 'spy' ? t('player', { n: idx + 1 }) : null))
      .filter(Boolean)
      .join(', ');
    $('result-spies').textContent = spyNames;
    $('btn-again').textContent = t('playAgain');
    $('btn-menu-result').textContent = t('menu');
    feedback(agentsWin ? 'win' : 'lose');
    show('result');
  }

  // ---------- Retour haptique et sonore ----------
  let audioCtx = null;
  function beep(freq, dur) {
    if (!state.sound) return;
    try {
      audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.frequency.value = freq;
      g.gain.value = 0.05;
      o.connect(g); g.connect(audioCtx.destination);
      o.start(); o.stop(audioCtx.currentTime + dur);
    } catch (e) {}
  }
  function feedback(kind) {
    if (state.vibe && navigator.vibrate) {
      try { navigator.vibrate(kind === 'end' ? [200, 100, 200] : 30); } catch (e) {}
    }
    beep(kind === 'end' ? 440 : 660, 0.12);
  }

  // ---------- Réglages ----------
  function bindSettings() {
    $('lang-select').addEventListener('change', (e) => {
      state.lang = e.target.value;
      store.set('lang', state.lang);
      applyLang(state.lang);
    });
    $('theme-select').addEventListener('change', (e) => {
      state.theme = e.target.value;
      store.set('theme', state.theme);
      applyTheme(state.theme);
    });
    $('sound-toggle').checked = state.sound;
    $('sound-toggle').addEventListener('change', (e) => { state.sound = e.target.checked; store.set('sound', state.sound); });
    $('vibe-toggle').checked = state.vibe;
    $('vibe-toggle').addEventListener('change', (e) => { state.vibe = e.target.checked; store.set('vibe', state.vibe); });
    $('theme-select').value = state.theme;
  }

  // ---------- Boutons de partie ----------
  function bindGame() {
    $('btn-show').addEventListener('click', showCard);
    $('btn-hide').addEventListener('click', hideCardAndNext);
    $('btn-to-vote').addEventListener('click', () => { clearInterval(state.timerId); startVote(); });
    $('btn-again').addEventListener('click', startGame);
    $('btn-menu-result').addEventListener('click', () => show('menu'));
  }

  // ---------- Initialisation ----------
  function init() {
    const lang = state.lang && STRINGS[state.lang] ? state.lang : detectLang();
    applyLang(lang);
    applyTheme(state.theme);
    bindMenu();
    bindSettings();
    bindGame();
    updateSteppers();
    show('menu');
  }

  // Pour les tests automatisés : état lisible sans toucher au DOM.
  window.render_game_to_text = function () {
    const active = screens.find((s) => $(s).classList.contains('active'));
    return JSON.stringify({ screen: active, lang: currentLang, players: state.players, spies: state.spies, category: state.category, timerMin: state.timerMin });
  };

  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  init();
})();
