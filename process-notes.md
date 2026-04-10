# ExploreQuest — Process Notes

## Project Pivot
Learner restarted the project mid-build. Original project (StudyQuest) was a quiz-based RPG with Claude API integration; all 8 items were complete. Learner decided to remove all AI/study mechanics and rebuild as a pure 2D exploration game inspired by Terraria. The equipment system (Sword, Armor, Wings) is preserved but earned by finding chests through exploration rather than answering questions.

Key decisions in the new design:
- No Claude API, no Flask API routes — Flask serves the HTML only
- HTML5 Canvas chosen for the game engine (browser-native, no install)
- Keyboard controls: arrow keys to move/jump, spacebar to attack, E to start boss, I/B for inventory
- Boss fight is action-based (real-time movement + attack) not quiz-based
- Wings grant double jump; Armor absorbs first hit; Sword deals 2 damage and reduces boss HP

## /build

Autonomous build — all 6 code items built in a single session.

Items 1–6 built in one pass directly (no subagents — project small enough to handle inline):
- Item 1: Flask app.py + templates/index.html + static/style.css + static/game.js scaffold
- Item 2: Tile map (75×15 grid), camera follow, render loop with tile color mapping
- Item 3: Player physics (gravity 0.45, jump -11, AABB tile collision, platform one-way collision)
- Item 4: 3 chests at world x=256/1200/2144, AABB pickup, float label system, HUD item count
- Item 5: HTML overlay inventory panel, I/B key toggle, dynamic item cards
- Item 6: Boss AI (walks toward player, 60-frame attack cooldown), spacebar attack with range check, armor/sword/wing effects, HP bars, win/lose overlays

Checkpoint 1 and 2 are ready for learner to verify.
