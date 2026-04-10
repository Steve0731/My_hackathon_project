// ============================================================
// Exploria — game.js
// ============================================================

// --- Canvas (must be first) ---
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// --- Constants ---
const TILE = 32;
const COLS = 75;
const ROWS = 15;
const WORLD_W = COLS * TILE;
const WORLD_H = ROWS * TILE;
const CANVAS_W = 800;
const CANVAS_H = 480;
const SURFACE_Y = 11 * TILE; // y-top of grass row = 352

// ============================================================
// MUSIC  (Web Audio API)
// ============================================================
let audioCtx = null;
let musicInterval = null;
let musicNoteIdx = 0;
let currentTrack = null;

const MUSIC = {
  explore: {
    melody: [440, 392, 329.63, 261.63, 220, 261.63, 329.63, 392],
    bass:   [110, 110, 130.81, 110],
    beatMs: 340,
    melType: 'square',
    bassType: 'triangle',
    melVol: 0.06,
    bassVol: 0.04,
  },
  boss: {
    melody: [440, 466.16, 440, 392, 349.23, 329.63, 293.66, 329.63],
    bass:   [220, 233.08, 220, 220],
    beatMs: 185,
    melType: 'sawtooth',
    bassType: 'square',
    melVol: 0.07,
    bassVol: 0.05,
  },
};

function playTone(freq, dur, type, vol, delay = 0) {
  if (!audioCtx) return;
  const osc  = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.type = type;
  osc.frequency.value = freq;
  const t = audioCtx.currentTime + delay;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur * 0.85);
  osc.start(t);
  osc.stop(t + dur);
}

function startMusic(track) {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (musicInterval) clearInterval(musicInterval);
  musicNoteIdx = 0;
  currentTrack = track;
  const cfg = MUSIC[track];
  musicInterval = setInterval(() => {
    const i = musicNoteIdx % cfg.melody.length;
    playTone(cfg.melody[i], cfg.beatMs / 1000 * 0.8, cfg.melType, cfg.melVol);
    if (i % 2 === 0) {
      playTone(cfg.bass[Math.floor(i / 2) % cfg.bass.length],
               cfg.beatMs / 1000 * 1.6, cfg.bassType, cfg.bassVol);
    }
    musicNoteIdx++;
  }, cfg.beatMs);
}

// ============================================================
// TILE MAP
// ============================================================
const TILE_COLORS = {
  0: null,
  1: '#777',
  2: '#8B5E3C',
  3: '#5a8a3c',
  4: '#c8a87a',
};

function buildMap() {
  const map = [];
  for (let r = 0; r < ROWS; r++) map.push(new Array(COLS).fill(0));

  // Platforms (row 10): original three + four more scattered high
  const platforms = [
    [5, 8], [15, 18], [27, 30], [38, 41], [45, 48], [55, 58], [62, 65], [70, 73]
  ];
  for (const [s, e] of platforms)
    for (let c = s; c <= e; c++) map[10][c] = 4;

  // High platforms (row 7)
  const highPlatforms = [[10, 12], [35, 37], [52, 54], [67, 69]];
  for (const [s, e] of highPlatforms)
    for (let c = s; c <= e; c++) map[7][c] = 4;

  // Surface (row 11): grass everywhere
  for (let c = 0; c < COLS; c++) map[11][c] = 3;

  // Dirt rows 12–13
  for (let r = 12; r <= 13; r++)
    for (let c = 0; c < COLS; c++) map[r][c] = 2;

  // Stone row 14
  for (let c = 0; c < COLS; c++) map[14][c] = 1;

  return map;
}
const MAP = buildMap();

function tileAt(wx, wy) {
  const col = Math.floor(wx / TILE);
  const row = Math.floor(wy / TILE);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return 1;
  return MAP[row][col];
}
function isSolid(t) { return t === 1 || t === 2 || t === 3; }

// ============================================================
// WORLD DECORATIONS  (pre-computed)
// ============================================================

// Mountains (two parallax layers, world-space x)
const FAR_PEAKS = Array.from({length: 28}, (_, i) => ({
  x: i * 200 + Math.sin(i * 1.1) * 30,
  h: 110 + Math.sin(i * 1.7) * 55 + Math.cos(i * 0.9) * 25,
  w: 120,
}));
const NEAR_PEAKS = Array.from({length: 22}, (_, i) => ({
  x: i * 170 + 60 + Math.cos(i * 1.3) * 25,
  h: 70 + Math.sin(i * 2.1) * 35,
  w: 90,
}));

// Clouds
const CLOUDS = [
  {x:120,y:38,w:88,h:28}, {x:340,y:18,w:64,h:22}, {x:560,y:52,w:96,h:30},
  {x:820,y:24,w:74,h:25}, {x:1060,y:44,w:80,h:22}, {x:1280,y:15,w:90,h:28},
  {x:1520,y:36,w:68,h:20}, {x:1750,y:50,w:82,h:26}, {x:1980,y:22,w:76,h:24},
  {x:2200,y:40,w:88,h:28}, {x:2380,y:16,w:60,h:18},
];

// Trees  (world-space x; y is always surface)
const TREES = [
  {x:130,type:'tall'},{x:310,type:'round'},{x:530,type:'tall'},
  {x:760,type:'round'},{x:980,type:'tall'},{x:1130,type:'round'},
  {x:1420,type:'tall'},{x:1660,type:'round'},{x:1880,type:'tall'},
  {x:2090,type:'round'},{x:2310,type:'tall'},
];

// Underground crystals  (world-space x, planted at row 13 top)
const CRYSTALS = [
  {x:370, h:22, color:'#8844ff'}, {x:580, h:16, color:'#44ddcc'},
  {x:850, h:28, color:'#ff44aa'}, {x:1100, h:18, color:'#44aaff'},
  {x:1350, h:24, color:'#ffaa44'}, {x:1620, h:20, color:'#88ff44'},
  {x:1900, h:26, color:'#ff8844'}, {x:2150, h:18, color:'#44ffaa'},
];

// ============================================================
// ITEM INFO
// ============================================================
const ITEM_INFO = {
  sword: { name: 'Iron Sword',  emoji: '⚔️', effect: 'Deals 2 damage per hit. Reduces boss HP 12→8.' },
  armor: { name: 'Chain Armor', emoji: '🛡️', effect: '+3 max HP (total 8). Absorbs your first hit.' },
  wing:  { name: 'Angel Wings', emoji: '🪽', effect: 'Grants a double jump during the boss fight.' },
};

// ============================================================
// PLAYER
// ============================================================
const player = {
  x: 64, y: 288, w: 24, h: 32,
  vx: 0, vy: 0,
  onGround: false, jumpsLeft: 1,
  speed: 3, jumpPower: -11,
  color: '#88aaff',
  equipment: [],
  facing: 1,
};

// ============================================================
// STATE
// ============================================================
const state = {
  phase: 'start',   // 'start' | 'game' | 'boss' | 'win' | 'lose'
  allCollected: false,
  playerHp: 5, playerMaxHp: 5,
  bossHp: 12,  bossMaxHp: 12,
  armorShield: false,
  attackDebounce: 0,
  attackAnim: 0,
  attackHit: false,
  bossHitFlash: 0,
  startPulse: 0,   // timer for pulsing start-screen text
};

let cameraX = 0;
let boss = null;

// ============================================================
// CHESTS
// ============================================================
const chests = [
  { x: 256,  y: SURFACE_Y - 32, w: 32, h: 32, item: 'sword', opened: false },
  { x: 1200, y: SURFACE_Y - 32, w: 32, h: 32, item: 'armor', opened: false },
  { x: 2144, y: SURFACE_Y - 32, w: 32, h: 32, item: 'wing',  opened: false },
];

// ============================================================
// FLOATING LABELS
// ============================================================
const floatLabels = [];
function addFloatLabel(text, wx, wy) {
  floatLabels.push({ text, x: wx, y: wy, alpha: 1.0, timer: 120 });
}

// ============================================================
// INPUT
// ============================================================
const keys = {};

function startGame() {
  state.phase = 'game';
  startMusic('explore');
}

window.addEventListener('keydown', e => {
  // Start screen
  if (state.phase === 'start') {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startGame(); }
    return;
  }

  keys[e.key] = true;

  // Jump
  if ((e.key === ' ' || e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') &&
      state.phase !== 'lose' && state.phase !== 'win') {
    e.preventDefault();
    if (player.jumpsLeft > 0) { player.vy = player.jumpPower; player.jumpsLeft--; }
  }

  // Inventory
  if ((e.key === 'i' || e.key === 'I' || e.key === 'b' || e.key === 'B') && state.phase === 'game') {
    const panel = document.getElementById('inventory-panel');
    const isOpen = panel.style.display === 'block';
    if (!isOpen) { buildInventoryPanel(); panel.style.display = 'block'; }
    else panel.style.display = 'none';
  }

  // Start boss
  if ((e.key === 'e' || e.key === 'E') && state.phase === 'game') startBoss();
});

window.addEventListener('keyup', e => { keys[e.key] = false; });

canvas.addEventListener('mousedown', e => {
  if (state.phase === 'start') { startGame(); return; }
  if (e.button === 0 && state.phase === 'boss' && state.attackDebounce === 0) attackBoss();
});

// ============================================================
// PHYSICS
// ============================================================
function resolveX(ent) {
  if (isSolid(tileAt(ent.x, ent.y + 1)) || isSolid(tileAt(ent.x, ent.y + ent.h - 2))) {
    ent.x = Math.ceil(ent.x / TILE) * TILE; ent.vx = 0;
  }
  if (isSolid(tileAt(ent.x + ent.w, ent.y + 1)) || isSolid(tileAt(ent.x + ent.w, ent.y + ent.h - 2))) {
    ent.x = Math.floor((ent.x + ent.w) / TILE) * TILE - ent.w; ent.vx = 0;
  }
}

function resolveY(ent) {
  ent.onGround = false;
  if (ent.vy >= 0) {
    const bot = ent.y + ent.h;
    if (isSolid(tileAt(ent.x + 2, bot)) || isSolid(tileAt(ent.x + ent.w - 3, bot))) {
      ent.y = Math.floor(bot / TILE) * TILE - ent.h; ent.vy = 0; ent.onGround = true;
    }
    if (!ent.onGround) {
      const prevBot = bot - ent.vy;
      const leftCol  = Math.floor((ent.x + 2) / TILE);
      const rightCol = Math.floor((ent.x + ent.w - 3) / TILE);
      outer:
      for (let c = leftCol; c <= rightCol; c++) {
        for (let r = 0; r < ROWS; r++) {
          if (MAP[r][c] === 4) {
            const platTop = r * TILE;
            // Land if bottom was at or above platform top last frame and is now at or past it
            if (prevBot <= platTop + 2 && bot >= platTop) {
              ent.y = platTop - ent.h; ent.vy = 0; ent.onGround = true;
              break outer;
            }
          }
        }
      }
    }
  }
  if (ent.vy < 0) {
    if (isSolid(tileAt(ent.x + 2, ent.y)) || isSolid(tileAt(ent.x + ent.w - 3, ent.y))) {
      ent.y = Math.ceil(ent.y / TILE) * TILE; ent.vy = 0;
    }
  }
}

// ============================================================
// UPDATE
// ============================================================
function updatePlayer() {
  if (keys['ArrowLeft'] || keys['a'] || keys['A']) { player.vx = -player.speed; player.facing = -1; }
  else if (keys['ArrowRight'] || keys['d'] || keys['D']) { player.vx = player.speed; player.facing = 1; }
  else player.vx = 0;

  player.vy += 0.45;
  if (player.vy > 12) player.vy = 12;

  player.x += player.vx;
  resolveX(player);
  player.x = Math.max(0, Math.min(player.x, WORLD_W - player.w));

  player.y += player.vy;
  resolveY(player);

  if (player.onGround)
    player.jumpsLeft = (player.equipment.includes('wing') && state.phase === 'boss') ? 2 : 1;

  cameraX = Math.max(0, Math.min(player.x - CANVAS_W / 2, WORLD_W - CANVAS_W));
}

function checkChests() {
  for (const c of chests) {
    if (c.opened) continue;
    if (player.x < c.x + c.w && player.x + player.w > c.x &&
        player.y < c.y + c.h && player.y + player.h > c.y) {
      c.opened = true;
      player.equipment.push(c.item);
      addFloatLabel(ITEM_INFO[c.item].emoji + ' ' + ITEM_INFO[c.item].name,
                    player.x + player.w / 2, player.y - 10);
      if (player.equipment.length === 3) state.allCollected = true;
    }
  }
}

function applyEquipmentEffects() {
  if (player.equipment.includes('armor')) {
    state.playerMaxHp = 8; state.playerHp = 8; state.armorShield = true;
  } else {
    state.playerMaxHp = 5; state.playerHp = 5;
  }
  state.bossMaxHp = player.equipment.includes('sword') ? 8 : 12;
  state.bossHp = state.bossMaxHp;
  player.jumpsLeft = player.equipment.includes('wing') ? 2 : 1;
}

function startBoss() {
  document.getElementById('inventory-panel').style.display = 'none';
  applyEquipmentEffects();
  state.phase = 'boss';
  boss = {
    x: Math.min(player.x + 500, WORLD_W - 80),
    y: SURFACE_Y - 48,
    w: 48, h: 48, vx: 0, vy: 0,
    onGround: false, attackCooldown: 0, color: '#cc3333',
  };
  startMusic('boss');
}

function updateBoss() {
  if (!boss) return;
  boss.vx = (boss.x + boss.w / 2) > (player.x + player.w / 2) ? -1.0 : 1.0;
  boss.vy += 0.45;
  if (boss.vy > 12) boss.vy = 12;
  boss.x += boss.vx; resolveX(boss);
  boss.x = Math.max(0, Math.min(boss.x, WORLD_W - boss.w));
  boss.y += boss.vy; resolveY(boss);

  if (boss.attackCooldown > 0) boss.attackCooldown--;
  if (boss.attackCooldown === 0 &&
      player.x < boss.x + boss.w && player.x + player.w > boss.x &&
      player.y < boss.y + boss.h && player.y + player.h > boss.y) {
    if (state.armorShield) {
      state.armorShield = false;
      addFloatLabel('🛡️ Armor blocked!', player.x + player.w / 2, player.y - 20);
    } else {
      state.playerHp--;
      addFloatLabel('-1 HP', player.x + player.w / 2, player.y - 20);
      if (state.playerHp <= 0) { triggerGameOver(false); return; }
    }
    boss.attackCooldown = 60;
  }
}

function attackBoss() {
  if (!boss) return;
  const dx = Math.abs((player.x + player.w / 2) - (boss.x + boss.w / 2));
  const dy = Math.abs((player.y + player.h / 2) - (boss.y + boss.h / 2));
  state.attackAnim = 10;
  if (dx < 70 && dy < 60) {
    state.attackHit = true;
    state.bossHitFlash = 6;
    const dmg = player.equipment.includes('sword') ? 2 : 1;
    state.bossHp -= dmg;
    addFloatLabel('-' + dmg, boss.x + boss.w / 2, boss.y - 10);
    if (state.bossHp <= 0) { state.bossHp = 0; triggerGameOver(true); return; }
  } else {
    state.attackHit = false;
  }
  state.attackDebounce = 12;
}

function triggerGameOver(won) {
  state.phase = won ? 'win' : 'lose';
  if (musicInterval) clearInterval(musicInterval);
  document.getElementById(won ? 'win-overlay' : 'lose-overlay').style.display = 'flex';
}

function buildInventoryPanel() {
  const el = document.getElementById('inv-items');
  if (!player.equipment.length) { el.innerHTML = '<p style="color:#555">No items yet.</p>'; return; }
  el.innerHTML = player.equipment.map(item => {
    const info = ITEM_INFO[item];
    return `<div class="inv-item"><div class="inv-item-name">${info.emoji} ${info.name}</div><div class="inv-item-effect">${info.effect}</div></div>`;
  }).join('');
}

function update() {
  if (state.phase === 'start') { state.startPulse++; return; }
  if (state.phase === 'win' || state.phase === 'lose') return;

  updatePlayer();
  checkChests();
  if (state.phase === 'boss') updateBoss();

  if (state.attackDebounce > 0) state.attackDebounce--;
  if (state.attackAnim > 0) state.attackAnim--;
  if (state.bossHitFlash > 0) state.bossHitFlash--;

  for (let i = floatLabels.length - 1; i >= 0; i--) {
    const l = floatLabels[i];
    l.timer--; l.alpha = l.timer / 120; l.y -= 0.5;
    if (l.timer <= 0) floatLabels.splice(i, 1);
  }
}

// ============================================================
// RENDER — helpers
// ============================================================

function drawStartScreen() {
  // Background
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, '#0a0a1a');
  grad.addColorStop(1, '#1a1a3a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  const stars = [[80,30],[200,15],[360,50],[500,20],[640,40],[750,12],[130,70],[420,80],[680,65],[310,35]];
  for (const [sx,sy] of stars) ctx.fillRect(sx, sy, 2, 2);

  // Mini tile strip at bottom (decorative)
  for (let c = 0; c < 25; c++) {
    ctx.fillStyle = c % 2 === 0 ? '#5a8a3c' : '#4a7a2c';
    ctx.fillRect(c * 32, CANVAS_H - 48, 32, 16);
    ctx.fillStyle = '#8B5E3C';
    ctx.fillRect(c * 32, CANVAS_H - 32, 32, 32);
  }
  // Grass highlight
  ctx.fillStyle = '#7cc44e';
  ctx.fillRect(0, CANVAS_H - 48, CANVAS_W, 4);

  // Title
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = 'bold 52px monospace';
  ctx.fillStyle = '#ffd700';
  ctx.shadowColor = '#ffaa00';
  ctx.shadowBlur = 18;
  ctx.fillText('Exploria', CANVAS_W / 2, 130);
  ctx.shadowBlur = 0;

  // Tagline
  ctx.font = '16px monospace';
  ctx.fillStyle = '#aaccff';
  ctx.fillText('Explore  ·  Collect  ·  Conquer', CANVAS_W / 2, 178);

  // Controls box
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.fillRect(CANVAS_W/2 - 180, 210, 360, 170);
  ctx.strokeRect(CANVAS_W/2 - 180, 210, 360, 170);

  ctx.font = '13px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('Controls', CANVAS_W / 2, 228);

  const controls = [
    ['← →  /  A D', 'Move'],
    ['Space  /  ↑', 'Jump'],
    ['E', 'Challenge Boss'],
    ['Left Click', 'Attack  (Boss Fight)'],
    ['I', 'Inventory'],
  ];
  ctx.font = '12px monospace';
  controls.forEach(([key, desc], i) => {
    const y = 254 + i * 22;
    ctx.fillStyle = '#ffd700';
    ctx.textAlign = 'right';
    ctx.fillText(key, CANVAS_W / 2 - 10, y);
    ctx.fillStyle = '#ccc';
    ctx.textAlign = 'left';
    ctx.fillText(desc, CANVAS_W / 2 + 10, y);
  });

  // Pulsing start prompt
  const pulse = 0.55 + 0.45 * Math.sin(state.startPulse * 0.07);
  ctx.globalAlpha = pulse;
  ctx.font = 'bold 15px monospace';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.fillText('ENTER  or  CLICK  to  begin', CANVAS_W / 2, 408);
  ctx.globalAlpha = 1.0;
}

function drawBackground() {
  // Sky gradient
  const grad = ctx.createLinearGradient(0, 0, 0, SURFACE_Y);
  grad.addColorStop(0, '#0d0d2b');
  grad.addColorStop(1, '#1e2d50');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Stars
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  const stars = [[80,20],[200,10],[380,38],[520,15],[680,30],[150,55],[440,65],[620,48],[760,22],[50,70]];
  for (const [sx,sy] of stars) ctx.fillRect(sx, sy, 2, 2);

  // Far mountains (very dark, low parallax)
  const off1 = cameraX * 0.12;
  ctx.fillStyle = '#131326';
  for (const p of FAR_PEAKS) {
    const sx = p.x - off1;
    if (sx + p.w < -20 || sx - p.w > CANVAS_W + 20) continue;
    ctx.beginPath();
    ctx.moveTo(sx - p.w, CANVAS_H);
    ctx.lineTo(sx, CANVAS_H - p.h);
    ctx.lineTo(sx + p.w, CANVAS_H);
    ctx.closePath();
    ctx.fill();
  }

  // Near mountains (slightly lighter, faster parallax)
  const off2 = cameraX * 0.28;
  ctx.fillStyle = '#1a1f3e';
  for (const p of NEAR_PEAKS) {
    const sx = p.x - off2;
    if (sx + p.w < -20 || sx - p.w > CANVAS_W + 20) continue;
    ctx.beginPath();
    ctx.moveTo(sx - p.w, CANVAS_H);
    ctx.lineTo(sx, CANVAS_H - p.h);
    ctx.lineTo(sx + p.w, CANVAS_H);
    ctx.closePath();
    ctx.fill();
  }

  // Clouds
  const cloudOff = cameraX * 0.05;
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  for (const c of CLOUDS) {
    const cx = c.x - cloudOff;
    if (cx + c.w < 0 || cx > CANVAS_W) continue;
    ctx.beginPath();
    ctx.ellipse(cx + c.w/2, c.y + c.h/2, c.w/2, c.h/2, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + c.w*0.3, c.y + c.h*0.4, c.w*0.3, c.h*0.55, 0, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + c.w*0.72, c.y + c.h*0.35, c.w*0.28, c.h*0.5, 0, 0, Math.PI*2);
    ctx.fill();
  }
}

function drawTrees() {
  for (const t of TREES) {
    const sx = t.x - cameraX;
    if (sx < -40 || sx > CANVAS_W + 40) continue;
    const baseY = SURFACE_Y; // top of grass
    if (t.type === 'tall') {
      // Trunk
      ctx.fillStyle = '#5C3A1E';
      ctx.fillRect(sx - 3, baseY - 28, 6, 28);
      // Canopy layers
      ctx.fillStyle = '#2a5c1a';
      ctx.fillRect(sx - 14, baseY - 52, 28, 14);
      ctx.fillStyle = '#336622';
      ctx.fillRect(sx - 10, baseY - 64, 20, 14);
      ctx.fillStyle = '#3d7a29';
      ctx.fillRect(sx - 6,  baseY - 74, 12, 12);
    } else {
      // Round tree
      ctx.fillStyle = '#5C3A1E';
      ctx.fillRect(sx - 3, baseY - 22, 6, 22);
      ctx.fillStyle = '#2d6620';
      ctx.fillRect(sx - 16, baseY - 46, 32, 16);
      ctx.fillStyle = '#378826';
      ctx.fillRect(sx - 12, baseY - 58, 24, 14);
      ctx.fillStyle = '#3a7a28';
      ctx.fillRect(sx - 8,  baseY - 68, 16, 12);
    }
  }
}

function drawUndergroundDetails() {
  // Crystals
  for (const cr of CRYSTALS) {
    const sx = cr.x - cameraX;
    if (sx < -10 || sx > CANVAS_W + 10) continue;
    const baseY = 13 * TILE; // top of dirt row 13
    // Crystal body (thin diamond shape)
    ctx.fillStyle = cr.color;
    ctx.globalAlpha = 0.75;
    ctx.beginPath();
    ctx.moveTo(sx, baseY - cr.h);
    ctx.lineTo(sx + 5, baseY - cr.h * 0.5);
    ctx.lineTo(sx + 3, baseY);
    ctx.lineTo(sx - 3, baseY);
    ctx.lineTo(sx - 5, baseY - cr.h * 0.5);
    ctx.closePath();
    ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath();
    ctx.moveTo(sx - 1, baseY - cr.h);
    ctx.lineTo(sx + 2, baseY - cr.h * 0.6);
    ctx.lineTo(sx - 1, baseY - cr.h * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

function drawTiles() {
  const startCol = Math.max(0, Math.floor(cameraX / TILE));
  const endCol   = Math.min(COLS, Math.ceil((cameraX + CANVAS_W) / TILE));

  for (let r = 0; r < ROWS; r++) {
    for (let c = startCol; c < endCol; c++) {
      const tile = MAP[r][c];
      if (!tile) continue;
      const sx = c * TILE - cameraX;
      const sy = r * TILE;
      ctx.fillStyle = TILE_COLORS[tile];
      ctx.fillRect(sx, sy, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 0.5;
      ctx.strokeRect(sx, sy, TILE, TILE);
      if (tile === 3) { ctx.fillStyle = '#7cc44e'; ctx.fillRect(sx, sy, TILE, 4); }
      // Stone variation dots
      if (tile === 1 && (c + r) % 3 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(sx + 6, sy + 6, 4, 4);
      }
      // Dirt texture
      if (tile === 2 && (c * 3 + r * 7) % 5 === 0) {
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.fillRect(sx + 10, sy + 10, 3, 3);
      }
    }
  }
}

function drawChests() {
  for (const c of chests) {
    const sx = c.x - cameraX;
    if (sx + c.w < 0 || sx > CANVAS_W) continue;
    if (c.opened) {
      ctx.fillStyle = '#5a3e2a';
      ctx.fillRect(sx, c.y, c.w, c.h);
      ctx.fillStyle = '#777';
      ctx.fillRect(sx + 6, c.y + c.h - 10, c.w - 12, 6);
    } else {
      ctx.fillStyle = '#8B5E3C';
      ctx.fillRect(sx, c.y, c.w, c.h);
      ctx.strokeStyle = '#c8a87a';
      ctx.lineWidth = 2;
      ctx.strokeRect(sx + 1, c.y + 1, c.w - 2, c.h - 2);
      ctx.fillStyle = '#ffd700';
      ctx.fillRect(sx + c.w/2 - 4, c.y + c.h/2 - 4, 8, 8);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', sx + c.w/2, c.y + c.h/2);
    }
  }
}

function drawBoss() {
  if (!boss) return;
  const bsx = boss.x - cameraX;
  ctx.fillStyle = state.bossHitFlash > 0 && state.bossHitFlash % 2 === 0 ? '#ffffff' : boss.color;
  ctx.fillRect(bsx, boss.y, boss.w, boss.h);
  ctx.fillStyle = '#ff6666';
  ctx.fillRect(bsx+4, boss.y+6, boss.w-8, boss.h-8);
  ctx.fillStyle = '#fff';
  ctx.fillRect(bsx+8, boss.y+10, 8, 8);
  ctx.fillRect(bsx+boss.w-16, boss.y+10, 8, 8);
  ctx.fillStyle = '#000';
  ctx.fillRect(bsx+10, boss.y+13, 4, 4);
  ctx.fillRect(bsx+boss.w-14, boss.y+13, 4, 4);
  ctx.fillStyle = '#000';
  ctx.fillRect(bsx+10, boss.y+28, boss.w-20, 4);
}

function drawPlayer() {
  const px = player.x - cameraX;
  const py = player.y;

  // Wings (behind body)
  if (player.equipment.includes('wing')) {
    const wX  = player.facing === 1 ? px - 1 : px + player.w + 1;
    const wDir = player.facing === 1 ? -1 : 1;
    ctx.save();
    ctx.fillStyle = 'rgba(200,230,255,0.85)';
    ctx.beginPath(); ctx.moveTo(wX,py+8); ctx.lineTo(wX+wDir*16,py-2); ctx.lineTo(wX+wDir*4,py+18); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(180,210,255,0.7)';
    ctx.beginPath(); ctx.moveTo(wX,py+18); ctx.lineTo(wX+wDir*12,py+28); ctx.lineTo(wX+wDir*2,py+32); ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  // Body
  ctx.fillStyle = player.color;
  ctx.fillRect(px, py, player.w, player.h);

  // Armor
  if (player.equipment.includes('armor')) {
    ctx.fillStyle = '#8899aa';
    ctx.fillRect(px+2, py+12, player.w-4, player.h-20);
    ctx.fillStyle = '#667788';
    ctx.fillRect(px+2, py+17, player.w-4, 2);
    ctx.fillRect(px+2, py+22, player.w-4, 2);
    ctx.fillStyle = '#aabbcc';
    ctx.fillRect(px,            py+8, 6, 6);
    ctx.fillRect(px+player.w-6, py+8, 6, 6);
  }

  // Face
  ctx.fillStyle = '#c8a87a';
  ctx.fillRect(px+4, py+4, player.w-8, 10);
  ctx.fillStyle = '#000';
  if (player.facing === 1) {
    ctx.fillRect(px+6,  py+7, 3, 3);
    ctx.fillRect(px+13, py+7, 3, 3);
  } else {
    ctx.fillRect(px+8,  py+7, 3, 3);
    ctx.fillRect(px+15, py+7, 3, 3);
  }

  // Legs
  ctx.fillStyle = '#334';
  ctx.fillRect(px+3,            py+player.h-8, 8, 8);
  ctx.fillRect(px+player.w-11,  py+player.h-8, 8, 8);

  // Sword
  if (player.equipment.includes('sword')) {
    ctx.save();
    if (player.facing === 1) {
      ctx.fillStyle = '#8B5E3C'; ctx.fillRect(px+player.w,   py+16, 5, 8);
      ctx.fillStyle = '#aaa';    ctx.fillRect(px+player.w-2, py+14, 9, 3);
      ctx.fillStyle = '#ddd';    ctx.fillRect(px+player.w+1, py-4,  3, 20);
      ctx.fillStyle = '#fff';    ctx.fillRect(px+player.w+1, py-4,  1, 20);
    } else {
      ctx.fillStyle = '#8B5E3C'; ctx.fillRect(px-5,  py+16, 5, 8);
      ctx.fillStyle = '#aaa';    ctx.fillRect(px-7,  py+14, 9, 3);
      ctx.fillStyle = '#ddd';    ctx.fillRect(px-4,  py-4,  3, 20);
      ctx.fillStyle = '#fff';    ctx.fillRect(px-4,  py-4,  1, 20);
    }
    ctx.restore();
  }
}

function drawAttackEffects() {
  const px = player.x - cameraX;
  const py = player.y;

  // Attack range circle
  if (state.phase === 'boss') {
    const pcx = player.x + player.w/2 - cameraX;
    const pcy = player.y + player.h/2;
    const inRange = boss &&
      Math.abs((player.x+player.w/2) - (boss.x+boss.w/2)) < 70 &&
      Math.abs((player.y+player.h/2) - (boss.y+boss.h/2)) < 60;
    ctx.save();
    ctx.setLineDash([5,4]);
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = inRange ? 'rgba(255,220,50,0.7)' : 'rgba(255,255,255,0.2)';
    ctx.beginPath(); ctx.arc(pcx, pcy, 70, 0, Math.PI*2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.font = '10px monospace';
    ctx.fillStyle = inRange ? 'rgba(255,220,50,0.9)' : 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText('attack range', pcx, pcy - 74);
    ctx.restore();
  }

  // Slash arc
  if (state.attackAnim > 0) {
    const t = state.attackAnim / 10;
    const alpha = t * 0.9;
    const color = state.attackHit ? `rgba(255,200,50,${alpha})` : `rgba(200,220,255,${alpha})`;
    const handX = player.facing === 1 ? px + player.w + 2 : px - 2;
    const handY = py + 14;
    const dir   = player.facing;
    const reach = 55 + (1-t) * 20;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = 4 - t*2;
    ctx.lineCap = 'round';
    ctx.shadowColor = state.attackHit ? '#ffcc00' : '#aaccff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(handX, handY, reach,
            dir === 1 ? -0.9 : Math.PI+0.9,
            dir === 1 ?  0.9 : Math.PI-0.9, false);
    ctx.stroke();
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.5;
    ctx.beginPath(); ctx.moveTo(handX,handY); ctx.lineTo(handX+dir*reach*0.9, handY-reach*0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(handX,handY); ctx.lineTo(handX+dir*reach*0.9, handY+reach*0.5); ctx.stroke();
    ctx.globalAlpha = 1.0;
    ctx.restore();
  }
}

function drawFloatLabels() {
  for (const l of floatLabels) {
    ctx.globalAlpha = l.alpha;
    ctx.fillStyle = '#ffe066';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(l.text, l.x - cameraX, l.y);
  }
  ctx.globalAlpha = 1.0;
}

function drawHUD() {
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  if (state.phase === 'game') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, CANVAS_W, 28);
    ctx.fillStyle = '#aaddff';
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Items: ' + player.equipment.length + '/3  |  I = Inventory', CANVAS_W/2, 8);
    ctx.fillStyle = '#ffd700';
    ctx.font = 'bold 14px monospace';
    ctx.fillText('Press E to challenge the boss!', CANVAS_W/2, CANVAS_H-28);
  }

  if (state.phase === 'boss') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, CANVAS_W, 36);

    ctx.font = '12px monospace';
    ctx.fillStyle = '#aaa'; ctx.textAlign = 'left';
    ctx.fillText('Player HP', 10, 6);
    ctx.fillStyle = '#222'; ctx.fillRect(10, 20, 150, 12);
    ctx.fillStyle = '#44cc66';
    ctx.fillRect(10, 20, 150 * Math.max(0, state.playerHp / state.playerMaxHp), 12);
    ctx.fillStyle = '#fff';
    ctx.fillText(state.playerHp + '/' + state.playerMaxHp, 168, 20);

    ctx.fillStyle = '#aaa'; ctx.textAlign = 'right';
    ctx.fillText('Boss HP', CANVAS_W-10, 6);
    ctx.fillStyle = '#222'; ctx.fillRect(CANVAS_W-160, 20, 150, 12);
    ctx.fillStyle = '#cc3333';
    ctx.fillRect(CANVAS_W-160, 20, 150 * Math.max(0, state.bossHp / state.bossMaxHp), 12);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'left';
    ctx.fillText(state.bossHp + '/' + state.bossMaxHp, CANVAS_W-190, 20);

    if (state.armorShield) {
      ctx.fillStyle = '#88ccff'; ctx.font = '11px monospace'; ctx.textAlign = 'center';
      ctx.fillText('🛡️ Armor shield active', CANVAS_W/2, 22);
    }

    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('Left Click = Attack  |  Space = Jump', CANVAS_W/2, CANVAS_H-16);
  }
}

// ============================================================
// MAIN RENDER
// ============================================================
function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  if (state.phase === 'start') { drawStartScreen(); return; }

  drawBackground();
  drawTrees();
  drawTiles();
  drawUndergroundDetails();
  drawChests();
  drawAttackEffects();   // range circle + slash (before boss/player)
  drawBoss();
  drawPlayer();
  drawFloatLabels();
  drawHUD();
}

// ============================================================
// GAME LOOP
// ============================================================
function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

gameLoop();
