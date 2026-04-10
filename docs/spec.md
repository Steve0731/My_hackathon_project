# ExploreQuest — Technical Spec

## Stack

| Layer | Choice |
|---|---|
| Backend | Python + Flask (serves index.html only) |
| Frontend | HTML5 Canvas + vanilla JavaScript |
| State | JS variables in browser — resets on page reload |
| Dependencies | `flask` only |

---

## File Structure

```
my-hackathon-project/
├── app.py                  ← Flask: one route, GET / → serves index.html
├── requirements.txt        ← flask
├── templates/
│   └── index.html          ← Canvas element + overlay divs
└── static/
    ├── style.css           ← Dark Terraria-style theme, overlay styles
    └── game.js             ← All game logic
```

---

## Backend (app.py)

One route only:
```python
@app.route('/')
def index():
    return render_template('index.html')
```

---

## Canvas + World Constants (game.js)

```js
const TILE = 32;          // tile size in pixels
const COLS = 75;          // world width in tiles
const ROWS = 15;          // world height in tiles
const WORLD_W = COLS * TILE;   // 2400px
const WORLD_H = ROWS * TILE;   // 480px
const CANVAS_W = 800;
const CANVAS_H = 480;
```

---

## Tile Map (game.js)

A 2D array `MAP[row][col]` where:
- `0` = sky (empty, no collision)
- `1` = stone (solid, gray)
- `2` = dirt (solid, brown)
- `3` = grass top (solid, green — surface row)
- `4` = platform (solid from above only — player can jump through from below)

Hand-authored map layout (described by region):
- Rows 0–9: all sky (0)
- Row 10: sky with two platforms (tile 4) at cols 15–18 and 45–48 and 62–65
- Row 11: all grass (3) — the main ground surface, 75 tiles wide
- Rows 12–13: all dirt (2)
- Row 14: all stone (1)

Chests are NOT tiles — they are objects placed at world pixel coordinates.

---

## Player Object

```js
const player = {
  x: 64,          // world-space x (left edge of player rect)
  y: 300,         // world-space y (top edge of player rect)
  w: 24,
  h: 32,
  vx: 0,
  vy: 0,
  onGround: false,
  jumpsLeft: 1,   // set to 2 when Wings are collected
  speed: 3,
  jumpPower: -11,
  color: '#88aaff',
};
```

Physics each frame:
1. Apply horizontal input: `vx = key.left ? -speed : key.right ? speed : 0`
2. Apply gravity: `vy += 0.45`; cap at `12`
3. Move x, resolve tile collisions (push out of tiles, zero vx)
4. Move y, resolve tile collisions (push out of tiles, zero vy, set onGround)
5. Clamp x to world bounds `[0, WORLD_W - player.w]`

Jump input: on keydown ArrowUp (or W or Space in non-boss context): if `jumpsLeft > 0`: set `vy = jumpPower`, decrement `jumpsLeft`. Reset `jumpsLeft` to 1 (or 2 with Wings) when `onGround`.

Platform tiles (4): only collide when player is moving downward (`vy > 0`) and player bottom was above platform top last frame.

---

## Camera

```js
let cameraX = 0; // world-space x of left edge of viewport
```

Each frame:
```js
cameraX = Math.max(0, Math.min(player.x - CANVAS_W / 2, WORLD_W - CANVAS_W));
```

All world-space positions are drawn at `(worldX - cameraX, worldY)` on the canvas.

---

## Tile Collision Detection

For tile collision, check the four corners of the player rect against the tile map:
```js
function tileAt(worldX, worldY) {
  const col = Math.floor(worldX / TILE);
  const row = Math.floor(worldY / TILE);
  if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return 1; // treat OOB as solid
  return MAP[row][col];
}
function isSolid(tile) { return tile === 1 || tile === 2 || tile === 3; }
// Platform (4): solid only when colliding from above (handled separately)
```

Move x first, resolve, then move y, resolve. This is the standard AABB approach.

---

## Chests

```js
const chests = [
  { x: 256,  y: 320, item: 'sword', opened: false },  // near start
  { x: 1200, y: 320, item: 'armor', opened: false },  // middle
  { x: 2144, y: 320, item: 'wing',  opened: false },  // far right
];
// y = row 11 top (11 * 32 = 352) minus chest height (32) = 320
```

Chest size: 32×32. Draw as a brown box with "?" if closed, open-chest emoji/color if opened.

Collision: simple AABB overlap check with player each frame. On overlap with an unopened chest:
- Set `chest.opened = true`
- Add item to `player.equipment` array
- Start floating label (item name + emoji, fades over 2 seconds)
- If `player.equipment.length === 3`: set `state.allCollected = true`

---

## Equipment Effects (applied on boss start)

```js
function applyEquipmentEffects() {
  if (player.equipment.includes('armor')) {
    state.playerMaxHp = 8;
    state.playerHp = 8;
    state.armorShield = true;  // absorbs first hit
  }
  if (player.equipment.includes('sword')) {
    state.bossMaxHp = 8;
    state.bossHp = 8;
  } else {
    state.bossMaxHp = 12;
    state.bossHp = 12;
  }
  if (player.equipment.includes('wing')) {
    player.jumpsLeft = 2; // double jump
  }
}
```

---

## Boss Object

```js
const boss = {
  x: CANVAS_W - 80,   // spawns at right side of screen (world-space: player.x + 600, clamped)
  y: 320,              // same ground level as player
  w: 48,
  h: 48,
  vx: -0.8,           // walks left toward player
  color: '#cc3333',
  attackCooldown: 0,  // frames before next damage to player
};
```

Boss AI (each frame during boss phase):
1. Move toward player: `boss.vx = boss.x > player.x ? -0.8 : 0.8`
2. Apply gravity and resolve ground collision same as player (boss stays on ground)
3. If AABB overlap with player and `attackCooldown === 0`:
   - If `state.armorShield`: set `armorShield = false`, show "Armor blocked!" text for 1.5s
   - Else: `state.playerHp -= 1`; if `playerHp <= 0`: trigger lose
   - Set `attackCooldown = 60` (1 second at 60fps)
4. Decrement `attackCooldown` each frame

Player attack (spacebar during boss phase, debounced — one press = one hit):
- If `Math.abs(player.x - boss.x) < 60`: apply damage to boss
  - Damage: `player.equipment.includes('sword') ? 2 : 1`
  - If `bossHp <= 0`: trigger win

---

## Floating Labels

Array `floatLabels`:
```js
{ text: '⚔️ Sword', x: player.x, y: player.y - 20, alpha: 1.0, timer: 120 }
```
Each frame: decrement `timer`, set `alpha = timer / 120`, move `y -= 0.5`. Remove when `timer <= 0`.

---

## Inventory Panel (HTML overlay, not canvas)

`<div id="inventory-panel">` in index.html, hidden by default (`display: none`).

Toggle: keydown `i` or `b` (lowercase) when `state.phase === 'game'`.

Content: dynamically build HTML listing each item in `player.equipment` with name, emoji, and effect.

Item display data:
```js
const ITEM_INFO = {
  sword: { name: 'Iron Sword',   emoji: '⚔️',  effect: 'Deals 2 damage per hit. Boss HP: 8 instead of 12.' },
  armor: { name: 'Chain Armor',  emoji: '🛡️',  effect: '+3 max HP (total 8). Blocks the first hit.' },
  wing:  { name: 'Angel Wings',  emoji: '🪽',  effect: 'Grants a double jump during the boss fight.' },
};
```

---

## Game State Machine

```js
const state = {
  phase: 'game',  // 'game' | 'boss' | 'win' | 'lose'
  allCollected: false,
  playerHp: 5,
  playerMaxHp: 5,
  bossHp: 12,
  bossMaxHp: 12,
  armorShield: false,
  attackDebounce: false,  // true for 10 frames after spacebar press
};
```

Phase transitions:
- `game` → `boss`: player presses E when `state.allCollected === true`
- `boss` → `win`: boss HP hits 0
- `boss` → `lose`: player HP hits 0
- `win`/`lose` → `game`: player clicks Restart button (full reset)

---

## HUD (drawn on canvas, world-independent)

During `game` phase:
- Top-left: player HP as hearts or `HP: X/Y`
- Top-center: collected item count `Items: X/3`
- If `allCollected`: bottom-center text `Press E to fight the boss`

During `boss` phase:
- Top-left: `Player HP: X/Y` bar (green fill, dark background)
- Top-right: `Boss HP: X/Y` bar (red fill)
- If armorShield active: small shield icon or "(ARMOR ACTIVE)" text

---

## Win/Lose Overlays (HTML)

Two divs in index.html: `#win-overlay` and `#lose-overlay`, both hidden by default.
- Each contains a message and a "Restart" button
- Restart button click: reload the page (`location.reload()`)

---

## Rendering Order (each frame)

1. Clear canvas
2. Draw sky background (fill rect with dark blue)
3. Draw tiles (only the visible columns: `Math.floor(cameraX / TILE)` to `Math.ceil((cameraX + CANVAS_W) / TILE)`)
4. Draw chests (with camera offset)
5. Draw boss (during boss phase)
6. Draw player (with camera offset)
7. Draw floating labels (with camera offset)
8. Draw HUD (fixed position, no camera offset)

---

## index.html Structure

```html
<canvas id="gameCanvas" width="800" height="480"></canvas>
<div id="inventory-panel">...</div>
<div id="win-overlay">...</div>
<div id="lose-overlay">...</div>
```

---

## style.css

- `body`: `background: #111; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0;`
- `canvas`: `border: 2px solid #444; display: block;`
- `#inventory-panel`: fixed overlay, dark semi-transparent background, centered, z-index above canvas
- `#win-overlay`, `#lose-overlay`: full-screen fixed overlay, centered text, Restart button

---

## Dependencies

```
flask
```

Install: `pip install flask`
