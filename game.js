/* ===================  game.js  =================== */
const SHIP_SIZE = 24;
const H_SPACING = SHIP_SIZE * 2.5;
const V_SPACING = SHIP_SIZE * 1.5;
const TOP_LIMIT = 0.4;

/* --- state --- */
let canvas, ctx, player, enemies = [], playerBullets = [], enemyBullets = [];
let score = 0, lives = 3, timer = 120, gameStartTime = 0;
let fireKey = ' ', gameInterval, timerInterval;
let vx = 50, vy = 50, enemyBulletSpeed = 200, fireCooldown = false, speedUps = 0;

/* --- audio --- */
const playerHitSound  = document.getElementById('playerHitSound');
const targetHitSound  = document.getElementById('targetHitSound');
const cannonFireSound = document.getElementById('cannonFireSound');
const bgMusic         = document.getElementById('bgMusic');
[playerHitSound, targetHitSound, cannonFireSound].forEach(a => a.volume = 0.2);
let musicPlaying = false;

/* --- HUD --- */
let scoreEl, livesEl, timerEl;

/* ---------- utils ---------- */
const rectsIntersect = (a, b) =>
  !(a.x > b.x + b.width || a.x + a.width < b.x ||
    a.y > b.y + b.height || a.y + a.height < b.y);

function updateHUD() {
  scoreEl.textContent = `Score: ${score}`;
  livesEl.textContent = `Lives: ${lives}`;
  timerEl.textContent = `Time: ${timer}`;
}

/* ---------- pause ---------- */
function pauseGame() {
  clearInterval(gameInterval);
  clearInterval(timerInterval);
  bgMusic.pause();
  musicPlaying = false;
  window.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('keyup', handleKeyUp);
}
window.pauseGame = pauseGame;

/* ---------- music toggle (exposed to main.js) ---------- */
window.toggleMusic = () => {
  if (musicPlaying) {
    bgMusic.pause();
    musicToggle.textContent = 'Music: OFF';
    musicToggle.classList.add('disabled');
  } else {
    bgMusic.play().catch(() => {});
    musicToggle.textContent = 'Music: ON';
    musicToggle.classList.remove('disabled');
  }
  musicPlaying = !musicPlaying;
  const s = JSON.parse(localStorage.getItem('gameSettings') || '{}');
  s.musicEnabled = musicPlaying;
  s.musicVolume  = bgMusic.volume;
  localStorage.setItem('gameSettings', JSON.stringify(s));
};

/* ---------- input ---------- */
function handleKeyDown(e) {
  if (e.key.toLowerCase() === fireKey.toLowerCase() && !fireCooldown) {
    fireBullet(); fireCooldown = true;
  }
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  player.left  |= e.key === 'ArrowLeft';
  player.right |= e.key === 'ArrowRight';
  player.up    |= e.key === 'ArrowUp';
  player.down  |= e.key === 'ArrowDown';
}
function handleKeyUp(e) {
  if (e.key.toLowerCase() === fireKey.toLowerCase()) fireCooldown = false;
  if (['ArrowLeft','ArrowRight','ArrowUp','ArrowDown',' '].includes(e.key)) e.preventDefault();
  if (e.key === 'ArrowLeft')  player.left  = false;
  if (e.key === 'ArrowRight') player.right = false;
  if (e.key === 'ArrowUp')    player.up    = false;
  if (e.key === 'ArrowDown')  player.down  = false;
}

/* ---------- fire – gentle diagonal (~25°) ---------- */
function fireBullet() {
  const SPEED = 300, SIN25 = 0.4226, COS25 = 0.9063;
  let dx = 0, dy = -SPEED;
  if (player.left ^ player.right) {
    dx = (player.left ? -1 : 1) * SPEED * SIN25;
    dy = -SPEED * COS25;
  }
  cannonFireSound.currentTime = 0; cannonFireSound.play();
  playerBullets.push({ x: player.x + SHIP_SIZE/2 - 3, y: player.y,
                       width: 6, height: 10, vx: dx, vy: dy });
}

/* ---------- enemy fire ---------- */
function enemyFire() {
  if (enemyBullets.length && enemyBullets.at(-1).y < canvas.height * 0.75) return;
  if (!enemies.length) return;
  const s = enemies[Math.floor(Math.random()*enemies.length)];
  enemyBullets.push({ x: s.x + SHIP_SIZE/2 - 3, y: s.y + SHIP_SIZE,
                      width: 6, height: 10, vx: 0, vy: enemyBulletSpeed });
}

/* ---------- start game ---------- */
function startGame(settings) {
  const saved = JSON.parse(localStorage.getItem('gameSettings') || '{}');
  bgMusic.volume = saved.musicVolume ?? 0.3;
  if (saved.musicEnabled ?? true) { bgMusic.play().catch(()=>{}); musicPlaying = true; }
  else { bgMusic.pause(); musicPlaying = false; }

  canvas  = gameCanvas; ctx = canvas.getContext('2d');
  fireKey = settings.fireKey; timer = settings.time * 60;
  score = 0; lives = 3; speedUps = 0;
  vx = 50 * (Math.random()<.5 ? -1 : 1); vy = vx; enemyBulletSpeed = 200;
  gameStartTime = Date.now();

  const startX = Math.random() * (canvas.width - SHIP_SIZE),
        startY = canvas.height - SHIP_SIZE;

  player = { x: startX, y: startY,
             width: SHIP_SIZE, height: SHIP_SIZE, color: settings.color,
             spawnX: startX, spawnY: startY,
             left:false, right:false, up:false, down:false };

  playerBullets = []; enemyBullets = []; createEnemies();
  updateHUD(); highscores.classList.add('hidden');

  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup',   handleKeyUp);

  clearInterval(gameInterval); clearInterval(timerInterval);
  gameInterval  = setInterval(updateGame, 20);
  timerInterval = setInterval(updateTimer, 1000);
}

/* ---------- enemy grid ---------- */
function createEnemies() {
  enemies = [];
  for (let r=0; r<4; r++) for (let c=0; c<5; c++)
    enemies.push({ x: 100 + c*H_SPACING, y: 50 + r*V_SPACING,
                   width: SHIP_SIZE, height: SHIP_SIZE, row: r });
}

/* ---------- timer (speed-ups) ---------- */
function updateTimer() {
  if (--timer <= 0) return endGame('time');

  if (timer % 5 === 0 && speedUps < 4) {
    const DELTA = 20;
    vx += (vx>0 ? DELTA : -DELTA);
    vy += (vy>0 ? DELTA : -DELTA);
    enemyBulletSpeed += DELTA;

    /* מאיצים גם את כל הכדורים שכבר על המסך */
    enemyBullets.forEach(b => b.vy += DELTA);

    speedUps++;
  }
  updateHUD();
}

/* ---------- game loop ---------- */
function updateGame() {
  const w = canvas.width, h = canvas.height, ms = 5, BZ = 0.6;
  if (player.left  && player.x > 0)                 player.x -= ms;
  if (player.right && player.x + player.width < w)  player.x += ms;
  if (player.up    && player.y > h * BZ)            player.y -= ms;
  if (player.down  && player.y + player.height < h) player.y += ms;

  let flipX = false, flipY = false;
  enemies.forEach(e => {
    if (e.x + vx/50 <= 0 || e.x + e.width + vx/50 >= w)        flipX = true;
    if (e.y + vy/50 <= 0 || e.y + e.height + vy/50 >= h*TOP_LIMIT) flipY = true;
  });
  if (flipX) vx *= -1;  if (flipY) vy *= -1;
  enemies.forEach(e => { e.x += vx/50; e.y += vy/50; });
  if (Math.random() < .02) enemyFire();

  playerBullets.forEach(b => { b.x += b.vx/50; b.y += b.vy/50; });
  enemyBullets .forEach(b => { b.x += b.vx/50; b.y += b.vy/50; });
  playerBullets = playerBullets.filter(b => b.y>-10 && b.x>-10 && b.x < w+10);
  enemyBullets  = enemyBullets .filter(b => b.y < h+10);

  checkCollisions(); draw();
}

/* ---------- collisions ---------- */
function checkCollisions() {
  const w = canvas.width, h = canvas.height;

  playerBullets.forEach((b,i) => enemies.forEach((e,j) => {
    if (rectsIntersect(b,e)) {
      targetHitSound.currentTime = 0; targetHitSound.play();
      score += [20,15,10,5][e.row]; updateHUD();
      playerBullets.splice(i,1); enemies.splice(j,1);
    }
  }));

  enemyBullets.forEach((b,i) => {
    if (rectsIntersect(b,player)) {
      playerHitSound.currentTime = 0; playerHitSound.play();
      if (--lives === 0) { updateHUD(); endGame('lost'); }
      else {
        enemyBullets.splice(i,1);
        player.x = player.spawnX; player.y = player.spawnY;
        player.left = player.right = player.up = player.down = false;
        updateHUD();
      }
    }
  });

  if (!enemies.length) endGame('win');
}

/* ---------- drawing ---------- */
function drawPlayerShip(p) {
  ctx.fillStyle = p.color;
  ctx.beginPath();
  ctx.moveTo(p.x + p.width/2, p.y);
  ctx.lineTo(p.x,            p.y + p.height);
  ctx.lineTo(p.x + p.width,  p.y + p.height);
  ctx.closePath();
  ctx.fill();
}
function draw() {
  ctx.clearRect(0,0,canvas.width,canvas.height);
  drawPlayerShip(player);
  enemies.forEach(e => {
    ctx.fillStyle = ['#f00','#f80','#ff0','#8f0'][e.row];
    ctx.fillRect(e.x,e.y,SHIP_SIZE,SHIP_SIZE);
  });
  ctx.fillStyle='cyan';   playerBullets.forEach(b=>ctx.fillRect(b.x,b.y,b.width,b.height));
  ctx.fillStyle='magenta';enemyBullets.forEach(b=>ctx.fillRect(b.x,b.y,b.width,b.height));
}

/* ---------- end game ---------- */
function endGame(reason){
  pauseGame();
  const msg=reason==='win'?'Champion!'
           :reason==='lost'?'You Lost!'
           :score>=100?`Winner! Score: ${score}`
           :`You can do better! Score: ${score}`;
  alert(msg); updateSessionScores(); showHighscores();
}

/* ---------- highscores ---------- */
function updateSessionScores(){
  const u=sessionStorage.getItem('currentUser')||'guest',k=`sessionScores_${u}`;
  const L=JSON.parse(sessionStorage.getItem(k)||'[]');
  L.push({score,start:new Date(gameStartTime).toLocaleString(),end:new Date().toLocaleString()});
  sessionStorage.setItem(k,JSON.stringify(L));
}
function showHighscores(){
  const u=sessionStorage.getItem('currentUser')||'guest',k=`sessionScores_${u}`;
  const L=JSON.parse(sessionStorage.getItem(k)||'[]');
  let html=`<div class="hs-modal"><button id="closeHS">✕</button><h3>Session Scores: ${u}</h3><ol>`;
  L.forEach(it=>html+=`<li>${it.score} pts<br>Start: ${it.start}<br>End: ${it.end}</li><hr>`); html+=`</ol><button id="newGameAfterHS">New Game</button></div>`;
  highscores.innerHTML=html; highscores.classList.remove('hidden');
}

/* ---------- DOM ready (attach HUD refs & events) ---------- */
document.addEventListener('DOMContentLoaded', () => {
  scoreEl = document.getElementById('score');
  livesEl = document.getElementById('lives');
  timerEl = document.getElementById('timer');

  highscores.addEventListener('click', e => {
    if (e.target.id === 'closeHS') highscores.classList.add('hidden');
    if (e.target.id === 'newGameAfterHS') {
      highscores.classList.add('hidden');
      if (window.lastSettings) startGame(window.lastSettings);
    }
  });
});