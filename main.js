// main.js

document.addEventListener('DOMContentLoaded', () => {
  const screens     = document.querySelectorAll('.screen');
  const users       = JSON.parse(localStorage.getItem('users') || '{}');
  const navWelcome  = document.getElementById('navWelcome');
  const navRegister = document.getElementById('navRegister');
  const navLogin    = document.getElementById('navLogin');
  const navLogout   = document.getElementById('navLogout');
  const configNav   = document.getElementById('configNav');
  let   currentUser = null;

  // keep last settings for restart
  window.lastSettings = null;

  function showScreen(id) {
    // Stop music if leaving game screen
    if (id !== 'game' && typeof stopGameMusic === 'function') {
      stopGameMusic();
    }
    
    screens.forEach(s => s.classList.toggle('active', s.id === id));
    document.getElementById('highscores').classList.add('hidden');
  }

  // initial nav state
  navWelcome.style.display  = '';
  navRegister.style.display = '';
  navLogin.style.display    = '';
  navLogout.style.display   = 'none';
  configNav.style.display   = 'none';

  // nav link handlers
  document.querySelectorAll('nav a').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      const tgt = link.dataset.target;
      if (tgt) showScreen(tgt);
    });
  });

  // Welcome buttons
  document.getElementById('btnToRegister')
    .addEventListener('click', () => showScreen('register'));
  document.getElementById('btnToLogin')
    .addEventListener('click', () => showScreen('login'));

  // Registration
  document.getElementById('registerForm')
    .addEventListener('submit', e => {
      e.preventDefault();
      const u   = document.getElementById('regUsername').value.trim();
      const p   = document.getElementById('regPassword').value;
      const c   = document.getElementById('regConfirm').value;
      const err = document.getElementById('registerError');
      err.textContent = '';

      if (p !== c) {
        err.textContent = 'Passwords do not match.'; return;
      }
      if (!/[A-Za-z]/.test(p) || !/\d/.test(p) || p.length < 8) {
        err.textContent = 'Must be ≥8 chars, letters & digits.'; return;
      }
      if (users[u]) {
        err.textContent = 'Username exists.'; return;
      }

      users[u] = {
        password: p,
        first:    document.getElementById('firstName').value.trim(),
        last:     document.getElementById('lastName').value.trim(),
        email:    document.getElementById('email').value.trim(),
        birth:    document.getElementById('birthdate').value
      };
      localStorage.setItem('users', JSON.stringify(users));
      alert('Registered! Please log in.');
      showScreen('login');
    });

  // Login
  document.getElementById('loginForm')
    .addEventListener('submit', e => {
      e.preventDefault();
      const u   = document.getElementById('loginUsername').value.trim();
      const p   = document.getElementById('loginPassword').value;
      const err = document.getElementById('loginError');
      err.textContent = '';

      const okLocal = users[u] && users[u].password === p;
      const okGuest = (u === 'p' && p === 'testuser');
      if (!okLocal && !okGuest) {
        err.textContent = 'Invalid credentials.'; return;
      }

      currentUser = u;
      sessionStorage.setItem('currentUser', u);
      sessionStorage.setItem(`sessionScores_${u}`, JSON.stringify([]));

      navWelcome.style.display  = 'none';
      navRegister.style.display = 'none';
      navLogin.style.display    = 'none';
      navLogout.style.display   = '';
      configNav.style.display   = 'inline-block';

      showScreen('config');
    });

  // Logout
  document.getElementById('logoutBtn')
    .addEventListener('click', e => {
      e.preventDefault();
      sessionStorage.removeItem('currentUser');

      navWelcome.style.display  = '';
      navRegister.style.display = '';
      navLogin.style.display    = '';
      navLogout.style.display   = 'none';
      configNav.style.display   = 'none';

      showScreen('welcome');
    });

  // Config → Start Game
  document.getElementById('configForm').addEventListener('submit', e => {
    e.preventDefault();
    const settings = {
      fireKey: document.getElementById('fireKey').value,
      time: parseInt(document.getElementById('gameTime').value, 10),
      color: document.getElementById('shipColor').value,
      musicVolume: parseFloat(document.getElementById('musicVolume').value),
      musicEnabled: !document.getElementById('musicToggle').classList.contains('disabled')
    };
    localStorage.setItem('gameSettings', JSON.stringify(settings));
    window.lastSettings = settings;
    showScreen('game');
    startGame(settings);
  });

  // New Game button in HUD
  document.getElementById('newGameButton')
    .addEventListener('click', () => {
      document.getElementById('highscores').classList.add('hidden');
      if (window.lastSettings) startGame(window.lastSettings);
    });

  // start at Welcome
  showScreen('welcome');

  const savedSettings = JSON.parse(localStorage.getItem('gameSettings')) || {};
if (savedSettings.musicVolume !== undefined) {
  document.getElementById('musicVolume').value = savedSettings.musicVolume;
}
if (savedSettings.musicEnabled === false) {
  document.getElementById('musicToggle').classList.add('disabled');
}
});
