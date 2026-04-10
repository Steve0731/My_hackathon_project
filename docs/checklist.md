# ExploreQuest — Build Checklist

## Build Preferences
- **Mode:** Autonomous
- **Verification:** Checkpoints after items 4 and 6
- **Git cadence:** None (no git repo)
- **Comprehension checks:** N/A (autonomous mode)

## Checkpoint Plan
- **Checkpoint 1** (after item 4): Player can move, jump, explore the tiled world, open all 3 chests, and see the boss prompt appear.
- **Checkpoint 2** (after item 6): Full boss fight works end-to-end with all equipment effects — win and lose screens both reachable.

---

## Checklist

- [x] **1. Project Setup**
  Spec ref: `spec.md > File Structure`, `spec.md > Backend`
  What to build: Create `requirements.txt` with only `flask`. Create `app.py` with one route: `GET /` returns `render_template('index.html')`. Create `templates/index.html` with a single `<canvas id="gameCanvas" width="800" height="480"></canvas>` element, a `<script src="/static/game.js"></script>` tag, and a `<link>` to `static/style.css`. Create `static/style.css` with: `body { background: #111; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }` and `canvas { border: 2px solid #444; display: block; }`. Create `static/game.js` with a minimal game loop: `const canvas = document.getElementById('gameCanvas'); const ctx = canvas.getContext('2d');` then a `gameLoop()` function that clears the canvas and draws "Hello World" text in white, called with `requestAnimationFrame(gameLoop)`.
  Acceptance: `python app.py` starts. Browser at `localhost:5000` shows a dark page with a canvas that says "Hello World".
  Verify: Run `python app.py`, open browser to `localhost:5000`, confirm "Hello World" text visible on dark canvas.

- [x] **2. Tile Map + Camera + Render Loop**
  Spec ref: `spec.md > Canvas + World Constants`, `spec.md > Tile Map`, `spec.md > Camera`, `spec.md > Rendering Order`
  What to build: In `game.js`: define `TILE=32, COLS=75, ROWS=15, WORLD_W=2400, WORLD_H=480, CANVAS_W=800, CANVAS_H=480`. Build the `MAP` 2D array (15 rows × 75 cols): rows 0–9 all 0 (sky); row 10 is 0 except cols 15–18, 45–48, 62–65 which are 4 (platforms); row 11 is all 3 (grass surface); rows 12–13 all 2 (dirt); row 14 all 1 (stone). Define a color map: 0=transparent (skip), 1=`#888` (stone), 2=`#8B5E3C` (dirt), 3=`#5a8a3c` (grass), 4=`#c8a87a` (wood platform). Implement `cameraX` variable and camera update formula from spec. In the render loop: fill canvas with `#1a1a2e` (dark blue-black sky). Draw only the visible tile columns using `cameraX` offset. Tiles of type 0 are skipped (sky shows through).
  Acceptance: Running the app shows a scrollable tiled world that looks like a Terraria ground — dark sky above, green surface row, dirt below. (Player not yet added, camera is fixed at 0 for now.)
  Verify: Open browser. Confirm dark sky, green row at the surface, brown dirt below. Platforms should be visible as lighter-brown elevated tiles around column 15.

- [x] **3. Player Movement + Physics + Collision**
  Spec ref: `spec.md > Player Object`, `spec.md > Tile Collision Detection`
  What to build: In `game.js`: define the `player` object from spec (x=64, y=288, w=24, h=32, vx=0, vy=0, onGround=false, jumpsLeft=1, speed=3, jumpPower=-11, color='#88aaff'). Add `keys = {}` object and keydown/keyup listeners. Each frame in `update()`: (1) apply horizontal input to vx; (2) apply gravity vy += 0.45, cap at 12; (3) move player.x += vx, then resolve x-axis tile collisions (push out of solids, zero vx); (4) move player.y += vy, resolve y-axis tile collisions (push out, zero vy, set onGround). Jump: keydown ArrowUp or 'w' or 'W' — if jumpsLeft > 0: vy = jumpPower, jumpsLeft--. Reset jumpsLeft to 1 on ground touch. Clamp player.x to [0, WORLD_W - player.w]. Implement platform tiles (type 4): only block downward movement (vy > 0) when player bottom was above platform top last frame. Update `cameraX` each frame to follow player. Draw player as a filled rectangle (player.color) at (player.x - cameraX, player.y). Draw a simple face: two white dots for eyes.
  Acceptance: Player is visible on screen. Arrow keys move left/right. Up arrow jumps. Player lands on ground tiles. Player cannot walk through stone/dirt walls. Camera follows player as they move right. Player can jump onto the elevated platforms.
  Verify: Arrow keys move player. Up arrow jumps. Player stays on ground. Camera scrolls as player moves right. Player can reach the platform at column 15.

- [x] **4. Chests + Item Pickup + Floating Labels**
  Spec ref: `spec.md > Chests`, `spec.md > Floating Labels`, `spec.md > Equipment Effects`
  What to build: In `game.js`: define the `chests` array from spec (3 chests at world x=256/y=320, x=1200/y=320, x=2144/y=320 with items sword/armor/wing, all opened=false). Each chest is 32×32. Draw each chest (if within visible range) as: if closed — brown rect (`#8B5E3C`) with white "?" text centered; if opened — lighter gray rect. Add `player.equipment = []` array. Each frame: AABB overlap check between player and each unopened chest. On overlap: set `chest.opened = true`, push `chest.item` to `player.equipment`, create a float label. Implement `floatLabels` array: each label has `{ text, x, y, alpha, timer: 120 }`. Each frame: decrement timer, alpha = timer/120, y -= 0.5, draw with `ctx.globalAlpha`. Remove when timer <= 0. Float label text: sword → "⚔️ Iron Sword", armor → "🛡️ Chain Armor", wing → "🪽 Angel Wings". When `player.equipment.length === 3`: set `state.allCollected = true`. HUD: draw "Items: X/3" top-center on canvas (no camera offset). If `allCollected`: draw "Press E to fight the boss!" bottom-center in yellow.
  Acceptance: Walking into each chest collects it (chest visually changes), item name floats up and fades, HUD shows item count. After all 3 collected, "Press E" message appears.
  Verify: Walk into each chest. Confirm chest changes to opened state. Confirm floating label with item name. Confirm HUD count increments. After 3rd: confirm "Press E" message.

---

### ✅ CHECKPOINT 1
**Player + world + collection smoke test:**
1. Open `localhost:5000`.
2. Move left/right with arrow keys — camera should scroll.
3. Jump up to the raised platform tiles.
4. Walk to x≈256 (near start) and collect first chest — confirm floating label appears.
5. Walk right to x≈1200 and collect second chest.
6. Walk right to x≈2144 and collect third chest — confirm "Press E to fight boss" appears.

**Only continue to item 5 after all steps pass.**

---

- [x] **5. Inventory Panel**
  Spec ref: `spec.md > Inventory Panel (HTML overlay, not canvas)`
  What to build: In `index.html`: add `<div id="inventory-panel" style="display:none">` containing a title "Inventory", a `<div id="inv-items">` for item cards, and a "Close (I)" note. In `style.css`: `#inventory-panel { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%); background: rgba(0,0,0,0.92); border: 2px solid #555; padding: 24px; min-width: 300px; color: #fff; font-family: monospace; z-index: 10; }`. In `game.js`: add keydown handler for `i` or `b` (case-insensitive) when `state.phase === 'game'`: toggle `#inventory-panel` display. When opening, rebuild `#inv-items` HTML from `player.equipment` using `ITEM_INFO` from spec. Each item: show emoji, name on one line, effect on next line. Empty state: "No items yet." text.
  Acceptance: Press I during exploration — inventory panel opens over the game. Press I again — closes. Collected items show with name, emoji, and effect. Empty state shows message when nothing collected.
  Verify: Press I with no items — confirm "No items yet." Collect a chest, press I — confirm item appears with correct info.

- [x] **6. Boss Fight + Win/Lose Screens**
  Spec ref: `spec.md > Boss Object`, `spec.md > Equipment Effects (applied on boss start)`, `spec.md > HUD`, `spec.md > Win/Lose Overlays`
  What to build: In `game.js`: keydown handler for `e` or `E` when `state.allCollected && state.phase === 'game'`: call `startBoss()`. `startBoss()`: call `applyEquipmentEffects()` (see spec), set `state.phase = 'boss'`, spawn boss at `{ x: player.x + 400 (clamped to WORLD_W - 80), y: 320, w: 48, h: 48, color: '#cc3333' }`. Boss update each frame (boss phase): move toward player (vx = ±0.8 based on player position), apply gravity + ground collision same as player, AABB overlap check with player → if overlapping and `attackCooldown === 0`: check armorShield (absorb, show "Armor blocked!" float label) else `playerHp -= 1`, set `attackCooldown = 60`. Player attack: keydown spacebar when phase is 'boss' and not `attackDebounce`: if `Math.abs(player.x - (boss.x + boss.w/2)) < 60 && Math.abs(player.y - (boss.y + boss.h/2)) < 60`: deal damage (1 or 2 with sword), set `attackDebounce = true`, reset after 10 frames. HP loss checks: if `playerHp <= 0` → `state.phase = 'lose'`; if `bossHp <= 0` → `state.phase = 'win'`. HUD during boss: draw player HP bar (green) top-left, boss HP bar (red) top-right. In `index.html`: add `#win-overlay` and `#lose-overlay` divs (hidden). Win: green "⭐ You Win!" + Restart button. Lose: red "💀 You Lose..." + Restart button. Restart button: `location.reload()`. Show the appropriate overlay when phase transitions to win/lose.
  Acceptance: Press E after collecting all 3 items. Boss appears and walks toward player. Spacebar deals damage. Wrong position spacebar does nothing. Boss touching player reduces player HP. Equipment effects apply. HP bars visible. Win and lose screens reachable.
  Verify: Collect all 3 items. Press E. Fight boss — confirm HP bars visible. Let boss kill player → confirm lose screen. Restart → repeat and kill boss → confirm win screen.

---

### ✅ CHECKPOINT 2
**Full end-to-end test:**
1. Open `localhost:5000`.
2. Collect all 3 chests — confirm all equipment effects listed in inventory (I key).
3. Press E — confirm boss spawns, both HP bars appear.
4. Let boss kill player (don't attack) — confirm Lose screen. Restart.
5. Collect all 3 again. Press E. Kill the boss — confirm Win screen.
6. Check Armor: take a hit — confirm "Armor blocked!" text on first hit, then real damage after.

**Only continue to item 7 after all steps pass.**

---

- [ ] **7. Devpost Submission**
  Spec ref: N/A (submission artifact)
  What to build: (1) Take two screenshots: one of the exploration world with the player visible, one of the boss fight with HP bars visible. (2) Go to Devpost: title "ExploreQuest", description: "ExploreQuest is a Terraria-inspired 2D browser game where you explore a tiled world, find hidden equipment in chests, and fight a boss with the gear you collected. Built with HTML5 Canvas and Flask." (3) Upload both screenshots. Fill in any required fields. Submit.
  Acceptance: Devpost submission has title, description, and at least one screenshot.
  Verify: Open submission preview — confirm all fields populated.
