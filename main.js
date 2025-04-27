/* ---------- main.js ---------- */
document.addEventListener('DOMContentLoaded', () => {
  /* ===== DOM handles ===== */
  const screens = document.querySelectorAll('.screen');
  const users   = JSON.parse(localStorage.getItem('users') || '{}');

  const nav = {
    welcome : navWelcome,
    register: navRegister,
    login   : navLogin,
    logout  : navLogout,
    config  : configNav
  };

  /* ===== state ===== */
  let capturedKey   = ' ';      // default Space
  let waitingForKey = false;
  window.lastSettings = null;   // last game config

  /* ===== helpers ===== */
  const labelForKey = k => (k === ' ' ? 'Space' : k.toUpperCase());

  const showScreen = id => {
    if (id !== 'game' && typeof window.pauseGame === 'function') window.pauseGame();
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    highscores.classList.add('hidden');
  };

  const setNav = logged => {
    nav.welcome.style.display  = logged ? 'none' : '';
    nav.register.style.display = logged ? 'none' : '';
    nav.login.style.display    = logged ? 'none' : '';
    nav.logout.style.display   = logged ? ''     : 'none';
    nav.config.style.display   = logged ? 'inline-block' : 'none';
  };

  /* ===== nav links to screens ===== */
  document.querySelectorAll('nav a[data-target]').forEach(a =>
    a.addEventListener('click', e => { e.preventDefault(); showScreen(a.dataset.target); })
  );

  btnToRegister.onclick = () => showScreen('register');
  btnToLogin   .onclick = () => showScreen('login');

  /* ===== registration ===== */
  registerForm.addEventListener('submit', e => {
    e.preventDefault();
    const u = regUsername.value.trim(), p = regPassword.value, c = regConfirm.value;
    registerError.textContent = '';

    if (p !== c) { registerError.textContent='Passwords do match'; return; }
    if (!/[A-Za-z]/.test(p) || !/\d/.test(p) || p.length < 8) {
      registerError.textContent='Weak password (min 8, letters+digits)'; return;
    }
    if (users[u]) { registerError.textContent='Username exists'; return; }

    users[u] = {
      password:p,
      first:firstName.value.trim(),
      last:lastName.value.trim(),
      email:email.value.trim(),
      birth:birthdate.value
    };
    localStorage.setItem('users', JSON.stringify(users));
    alert('Registered! Please log in.');
    showScreen('login');
  });

  /* ===== login ===== */
  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const u = loginUsername.value.trim(), p = loginPassword.value;
    loginError.textContent = '';

    const ok = (users[u] && users[u].password === p) || (u === 'p' && p === 'testuser');
    if (!ok) { loginError.textContent='Invalid credentials'; return; }

    sessionStorage.setItem('currentUser', u);
    sessionStorage.setItem(`sessionScores_${u}`, JSON.stringify([]));
    setNav(true); showScreen('config');
  });

  /* ===== logout ===== */
  logoutBtn.onclick = e => {
    e.preventDefault();
    sessionStorage.removeItem('currentUser');
    setNav(false); showScreen('welcome');
  };

  /* ===== fire-key picker ===== */
  const fireKeyBtn = document.getElementById('fireKeyBtn');
  fireKeyBtn.addEventListener('click', () => {
    if (waitingForKey) return;
    waitingForKey = true;
    fireKeyBtn.textContent = 'Press any key…';

    const once = e => {
      e.preventDefault();
      capturedKey = e.key;
      fireKeyBtn.textContent = labelForKey(capturedKey);
      waitingForKey = false;
      window.removeEventListener('keydown', once);
    };
    window.addEventListener('keydown', once);
  });

  /* ===== config → start game ===== */
  configForm.addEventListener('submit', e => {
    e.preventDefault();
    const settings = {
      fireKey      : capturedKey,
      time         : +gameTime.value,
      color        : shipColor.value,
      musicVolume  : +musicVolume.value,
      musicEnabled : !musicToggle.classList.contains('disabled')
    };
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    window.lastSettings = settings;
    showScreen('game'); startGame(settings);
  });

  /* ===== HUD new-game ===== */
  newGameButton.onclick = () => {
    highscores.classList.add('hidden');
    if (window.lastSettings) startGame(window.lastSettings);
  };

  /* ===== music prefs init ===== */
  const saved = JSON.parse(localStorage.getItem('gameSettings') || '{}');
  if (saved.musicVolume !== undefined) musicVolume.value = saved.musicVolume;
  if (saved.musicEnabled === false) musicToggle.classList.add('disabled');

  /* ===== modal ABOUT ===== */
  const aboutModal = document.getElementById('aboutModal');
  const openAbout  = document.getElementById('openAbout');
  const aboutClose = document.getElementById('aboutClose');

  openAbout.addEventListener('click', e=>{
    e.preventDefault();
    aboutModal.classList.remove('hidden');
  });
  aboutClose.addEventListener('click', () =>
    aboutModal.classList.add('hidden') );

  /* click outside closes */
  aboutModal.addEventListener('click', e=>{
    if (e.target === aboutModal) aboutModal.classList.add('hidden');
  });

  /* Esc closes */
  window.addEventListener('keydown', e=>{
    if (e.key === 'Escape' && !aboutModal.classList.contains('hidden')) {
      aboutModal.classList.add('hidden');
    }
  });

  /* ===== music controls events ===== */
  musicToggle.addEventListener('click', () => window.toggleMusic && window.toggleMusic());
  musicVolume.addEventListener('input', e => {
    const vol = +e.target.value;
    bgMusic.volume = vol;
    const s = JSON.parse(localStorage.getItem('gameSettings') || '{}');
    s.musicVolume = vol;
    localStorage.setItem('gameSettings', JSON.stringify(s));
  });

  /* ===== first screen ===== */
  setNav(false); showScreen('welcome');
});
