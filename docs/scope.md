# ExploreQuest — Project Scope

## What We're Building

A 2D side-scrolling exploration game inspired by Terraria, built in the browser with HTML5 Canvas + Flask. No AI, no study questions — pure game.

The player explores a hand-crafted 2D world, finds 3 hidden equipment items (Sword, Armor, Wings) in chests scattered across the map, then triggers a boss fight with the gear they collected.

## Core Gameplay Loop

1. Spawn in the world — move with arrow keys, jump, explore left and right
2. Walk into chests hidden across the map to open them and collect the item inside
3. Collect all 3 items → a "Fight Boss" prompt appears
4. Boss fight: boss charges at the player, player jumps and attacks with spacebar
5. Equipment affects the fight — Sword deals more damage, Armor absorbs one hit, Wings give a double jump
6. Win or lose → end screen → restart

## Tech Stack

- **Backend:** Flask (Python) — serves the single HTML page, nothing else
- **Frontend:** HTML5 Canvas + vanilla JavaScript (no framework)
- **Styling:** CSS (dark Terraria-style theme)
- **Dependencies:** `flask` only

## Target Platform

Desktop browser (Chrome/Firefox), keyboard controls (arrow keys + spacebar).

## What's NOT in Scope

- No AI or Claude API
- No questions, quizzes, or study content of any kind
- No note uploads or PDF parsing
- No database, accounts, or save state
- No procedural generation (map is hand-authored)
- No multiplayer
