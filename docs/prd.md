# ExploreQuest — Product Requirements

## Problem Statement

A simple, playable Terraria-inspired 2D exploration game where the player moves through a tiled world, finds hidden equipment in chests, and fights a boss. The whole experience is self-contained in a browser tab with no setup beyond running Flask.

---

## User Stories

### Epic: World Exploration

- As a player, I want to move my character left and right and jump so that I can explore the world.
  - [ ] Arrow left/right: player walks
  - [ ] Arrow up (or spacebar): player jumps
  - [ ] Gravity pulls the player down; player lands on tiles
  - [ ] Player cannot walk through solid tiles (walls, ground)
  - [ ] Camera follows the player horizontally (world scrolls)

- As a player, I want to see a Terraria-style world so that the game feels immersive.
  - [ ] Dark sky background
  - [ ] Tiled ground (stone/dirt) with a grass surface layer
  - [ ] Some raised platforms the player can jump onto
  - [ ] Player is a small colored rectangle with a face or character feel

### Epic: Equipment Collection

- As a player, I want to find and collect equipment in chests so that exploration has a purpose.
  - [ ] 3 chests are placed across the map (near start, middle, far right)
  - [ ] Walking into a chest opens it and gives the player the item inside
  - [ ] Chest changes appearance to "opened" state after pickup
  - [ ] Equipment name floats above the player for 2 seconds, then fades
  - [ ] Equipment items: Sword (⚔️), Armor (🛡️), Wings (🪽)
  - [ ] Each chest contains exactly one unique item

- As a player who has collected all 3 items, I want clear feedback so I know I can fight the boss.
  - [ ] After collecting all 3, a text hint appears: "Press E to challenge the boss"

### Epic: Inventory

- As a player, I want to view my collected equipment at any time.
  - [ ] Press I (or B) to toggle the inventory panel open/closed
  - [ ] Panel shows each collected item with name, icon, and effect description
  - [ ] Empty inventory shows "No items yet"
  - [ ] Panel is accessible during exploration (not during boss fight)

### Epic: Boss Fight

- As a player, I want to fight a boss using the equipment I collected.
  - [ ] Pressing E (when all 3 items collected) starts the boss fight
  - [ ] Boss spawns at the right side of the visible screen
  - [ ] Boss walks toward the player continuously
  - [ ] Player attacks the boss with spacebar (must be close — within 60px)
  - [ ] Player can still jump and move during the fight
  - [ ] Spacebar attack deals 1 damage per hit (2 with Sword)
  - [ ] Boss touching player deals 1 HP damage to the player (once per second max)
  - [ ] Player starts with 5 HP; Armor gives +3 HP (total 8)
  - [ ] Boss starts with 12 HP; Sword reduces it to 8
  - [ ] Wings grant a double jump during the boss fight
  - [ ] Armor absorbs the first hit taken (one-time shield)
  - [ ] HP bars for both player and boss displayed on screen

- As a player finishing the boss fight, I want a win or lose screen.
  - [ ] Win: boss HP hits 0 → "You Win!" overlay with Restart button
  - [ ] Lose: player HP hits 0 → "You Lose!" overlay with Restart button
  - [ ] Restart resets the whole game (back to start of world, all chests closed, boss gone)

---

## Non-Goals

- No study questions, quiz mechanics, or Claude API
- No PDF/text upload of any kind
- No save system or persistent state
- No animated sprites (colored rectangles with emoji icons are fine)
- No sound effects (out of scope for hackathon)
- No multiplayer
