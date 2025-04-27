// game.js

const SHIP_SIZE   = 24;              
const H_SPACING   = SHIP_SIZE * 2.5; 
const V_SPACING   = SHIP_SIZE * 1.5; 
const TOP_LIMIT   = 0.4;             
const BOTTOM_ZONE = 0.6;             

let canvas, ctx;
let player, enemies = [], playerBullets = [], enemyBullets = [];
let score = 0, lives = 3, timer = 120, gameStartTime = 0;
let fireKey = ' ';
let gameInterval, timerInterval;
let vx = 50, vy = 50, enemyBulletSpeed = 200;
let fireCooldown = false;
let speedUps = 0;
let playerHitSound = document.getElementById('playerHitSound');
let targetHitSound = document.getElementById('targetHitSound');
let cannonFireSound = document.getElementById('cannonFireSound');
const bgMusic = document.getElementById('bgMusic');
let musicPlaying = false;

// Update HUD
function updateHUD() {
  document.getElementById('score').innerText = `Score: ${score}`;
  document.getElementById('lives').innerText = `Lives: ${lives}`;
  document.getElementById('timer').innerText = `Time: ${timer}`;
}

function toggleMusic() {
  const musicToggle = document.getElementById('musicToggle');
  if (musicPlaying) {
    bgMusic.pause();
    musicToggle.textContent = 'Music: OFF';
    musicToggle.style.backgroundColor = '#555';
  } else {
    bgMusic.play().catch(e => console.log("Playback error:", e));
    musicToggle.textContent = 'Music: ON';
    musicToggle.style.backgroundColor = '';
  }
  musicPlaying = !musicPlaying;
  
  // Save music state to localStorage
  const settings = JSON.parse(localStorage.getItem('gameSettings') || '{}');
  settings.musicEnabled = musicPlaying;
  settings.musicVolume = bgMusic.volume;
  localStorage.setItem('gameSettings', JSON.stringify(settings));
}

// Update endGame to stop music
function endGame(reason) {
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  bgMusic.pause(); // Stop music when game ends
  musicPlaying = false;
  
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);

  let msg = '';
  if (reason==='win')  msg='Champion!';
  if (reason==='lost') msg='You Lost!';
  if (reason==='time') msg = score>=100
    ? `Winner! Score: ${score}`
    : `You can do better! Score: ${score}`;

  alert(msg);
  updateSessionScores();
  showHighscores();
}

function stopGameMusic() {
  bgMusic.pause();
  musicPlaying = false;
}

// Start game
function startGame(settings) {
  // Load music settings
  const savedSettings = JSON.parse(localStorage.getItem('gameSettings')) || {};
  const volume = savedSettings.musicVolume !== undefined ? savedSettings.musicVolume : 0.3;
  const musicEnabled = savedSettings.musicEnabled !== undefined ? savedSettings.musicEnabled : true;

  // Apply settings
  bgMusic.volume = volume;
  document.getElementById('musicVolume').value = volume;
  
  if (musicEnabled) {
    bgMusic.play().catch(e => console.log("Audio playback failed:", e));
    document.getElementById('musicToggle').classList.remove('disabled');
    musicPlaying = true;
  } else {
    bgMusic.pause();
    document.getElementById('musicToggle').classList.add('disabled');
    musicPlaying = false;
  }
  // Start background music
  bgMusic.volume = 0.3; // Set volume to 30%
  bgMusic.play().catch(e => {
    console.log("Audio playback failed:", e);
    // Browsers require user interaction first
  });
  musicPlaying = true;
  canvas = document.getElementById('gameCanvas');
  ctx    = canvas.getContext('2d');

  fireKey          = settings.fireKey;
  timer            = settings.time * 60;
  score            = 0;
  lives            = 3;
  vx               = 50 * (Math.random() < 0.5 ? -1 : 1);
  vy               = 50 * (Math.random() < 0.5 ? -1 : 1);
  enemyBulletSpeed = 200;
  speedUps         = 0;
  gameStartTime    = Date.now();

  player = {
    x:      canvas.width/2 - SHIP_SIZE/2,
    y:      canvas.height * BOTTOM_ZONE,
    width:  SHIP_SIZE,
    height: SHIP_SIZE,
    color:  settings.color,
    left:   false, right: false, up: false, down: false
  };

  playerBullets = [];
  enemyBullets  = [];
  createEnemies();

  updateHUD();
  document.getElementById('highscores').classList.add('hidden');

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup',   handleKeyUp);

  clearInterval(gameInterval);
  clearInterval(timerInterval);
  gameInterval  = setInterval(updateGame, 20);
  timerInterval = setInterval(updateTimer, 1000);
}

// Create enemy fleet
function createEnemies() {
  enemies = [];
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 5; c++) {
      enemies.push({
        x:      100 + c * H_SPACING,
        y:      50  + r * V_SPACING,
        width:  SHIP_SIZE,
        height: SHIP_SIZE,
        row:    r
      });
    }
  }
}

// Input
function handleKeyDown(e) {
  if (e.key === fireKey && !fireCooldown) {
    fireBullet(); fireCooldown = true;
  }
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
    e.preventDefault();
  }
  player.left  = player.left  || e.key==='ArrowLeft';
  player.right = player.right || e.key==='ArrowRight';
  player.up    = player.up    || e.key==='ArrowUp';
  player.down  = player.down  || e.key==='ArrowDown';
}
function handleKeyUp(e) {
  if (e.key === fireKey) fireCooldown = false;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) {
    e.preventDefault();
  }
  if (e.key==='ArrowLeft')  player.left = false;
  if (e.key==='ArrowRight') player.right= false;
  if (e.key==='ArrowUp')    player.up   = false;
  if (e.key==='ArrowDown')  player.down = false;
}

// Shooting
function fireBullet() {
  cannonFireSound.currentTime = 0; // Reset sound to start
  cannonFireSound.play();
  playerBullets.push({
    x:player.x + SHIP_SIZE/2 - 3,
    y:player.y,
    width:6, height:10,
    speed:-300
  });
}
function enemyFire() {
  const last = enemyBullets[enemyBullets.length-1];
  if (last && last.y < canvas.height * 0.75) return;
  if (!enemies.length) return;
  const shooter = enemies[Math.floor(Math.random()*enemies.length)];
  enemyBullets.push({
    x:      shooter.x + SHIP_SIZE/2 - 3,
    y:      shooter.y + SHIP_SIZE,
    width:  6, height:10,
    speed:  enemyBulletSpeed
  });
}

// Timer tick
function updateTimer() {
  timer--;
  if (timer <= 0) return endGame('time');
  if (timer % 5 === 0 && speedUps < 4) {
    vx += (vx > 0 ? 20 : -20);
    vy += (vy > 0 ? 20 : -20);
    enemyBulletSpeed += 20;
    speedUps++;
  }
  updateHUD();
}

// Main loop
function updateGame() {
  updatePlayer();
  updateEnemies();
  updateBullets();
  checkCollisions();
  draw();
}

// Move player only in bottom zone
function updatePlayer() {
  const ms = 5;
  if (player.left  && player.x > 0)                                player.x -= ms;
  if (player.right && player.x + player.width < canvas.width)      player.x += ms;
  if (player.up    && player.y > canvas.height * BOTTOM_ZONE)      player.y -= ms;
  if (player.down  && player.y + player.height < canvas.height)   player.y += ms;
}

// Move enemies diagonally within top zone
function updateEnemies() {
  let bx = false, by = false;
  enemies.forEach(e => {
    if (e.x + vx/50 <= 0 || e.x + e.width + vx/50 >= canvas.width)         bx = true;
    if (e.y + vy/50 <= 0 || e.y + e.height + vy/50 >= canvas.height * TOP_LIMIT) by = true;
  });
  if (bx) vx *= -1;
  if (by) vy *= -1;
  enemies.forEach(e => {
    e.x += vx/50;
    e.y += vy/50;
  });
  if (Math.random() < 0.02) enemyFire();
}

// Bullets
function updateBullets() {
  playerBullets.forEach(b => b.y += b.speed / 50);
  enemyBullets.forEach(b  => b.y += b.speed / 50);
  playerBullets = playerBullets.filter(b => b.y > -10);
  enemyBullets  = enemyBullets.filter(b => b.y < canvas.height + 10);
}

// Collisions
function checkCollisions() {
  // Check player bullets hitting enemies
  playerBullets.forEach((b, i) => {
    enemies.forEach((e, j) => {
      if (rectsIntersect(b, e)) {
        // Play target hit sound
        targetHitSound.currentTime = 0;
        targetHitSound.play();
        
        score += [20, 15, 10, 5][e.row];
        playerBullets.splice(i, 1);
        enemies.splice(j, 1);
        updateHUD();
      }
    });
  });

  // Check enemy bullets hitting player
  enemyBullets.forEach((b, i) => {
    if (rectsIntersect(b, player)) {
      // Play player hit sound
      playerHitSound.currentTime = 0;
      playerHitSound.play();
      
      lives--;
      enemyBullets.splice(i, 1);
      player.x = canvas.width / 2 - SHIP_SIZE / 2;
      player.y = canvas.height * BOTTOM_ZONE;
      updateHUD();
      
      if (lives === 0) endGame('lost');
    }
  });

  // Check if all enemies are defeated
  if (!enemies.length) endGame('win');
}

// AABB
function rectsIntersect(a,b) {
  return !(
    a.x > b.x + b.width ||
    a.x + a.width < b.x ||
    a.y > b.y + b.height ||
    a.y + a.height < b.y
  );
}

// Draw everything
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  // player
  ctx.fillStyle = player.color;
  ctx.fillRect(player.x,player.y,SHIP_SIZE,SHIP_SIZE);
  // enemies
  enemies.forEach(e => {
    ctx.fillStyle = ['#f00','#f80','#ff0','#8f0'][e.row];
    ctx.fillRect(e.x,e.y,SHIP_SIZE,SHIP_SIZE);
  });
  // bullets
  playerBullets.forEach(b => {
    ctx.fillStyle='cyan';
    ctx.fillRect(b.x,b.y,b.width,b.height);
  });
  enemyBullets.forEach(b => {
    ctx.fillStyle='magenta';
    ctx.fillRect(b.x,b.y,b.width,b.height);
  });
}


// Session scoring
function updateSessionScores() {
  const user = sessionStorage.getItem('currentUser')||'guest';
  const key  = `sessionScores_${user}`;
  const lst  = JSON.parse(sessionStorage.getItem(key)||'[]');
  lst.push({
    score,
    start: new Date(gameStartTime).toLocaleString(),
    end:   new Date().toLocaleString()
  });
  sessionStorage.setItem(key, JSON.stringify(lst));
}

// Show overlay
function showHighscores() {
  const user = sessionStorage.getItem('currentUser')||'guest';
  const key  = `sessionScores_${user}`;
  const lst  = JSON.parse(sessionStorage.getItem(key)||'[]');
  const div  = document.getElementById('highscores');
  let html   = `<div class="hs-modal">
    <button id="closeHS">✕</button>
    <h3>Session Scores: ${user}</h3>
    <ol>`;
  lst.forEach(item => {
    html += `<li>
      ${item.score} pts<br>
      Start: ${item.start}<br>
      End:   ${item.end}
    </li><hr>`;
  });
  html += `</ol>
    <button id="newGameAfterHS">New Game</button>
  </div>`;
  div.innerHTML = html;
  div.classList.remove('hidden');
}

// Overlay listeners
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('highscores')
    .addEventListener('click', e => {
      if (e.target.id === 'closeHS') {
        document.getElementById('highscores').classList.add('hidden');
      }
      if (e.target.id === 'newGameAfterHS') {
        document.getElementById('highscores').classList.add('hidden');
        if (window.lastSettings) startGame(window.lastSettings);
      }
    });
    document.getElementById('musicToggle').addEventListener('click', toggleMusic);
    document.getElementById('musicVolume').addEventListener('input', (e) => {
      const volume = parseFloat(e.target.value);
      bgMusic.volume = volume;
      
      // Save the current volume
      const settings = JSON.parse(localStorage.getItem('gameSettings')) || {};
      settings.musicVolume = volume;
      localStorage.setItem('gameSettings', JSON.stringify(settings));
    });
});
