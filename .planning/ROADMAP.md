# Roadmap: KidneyQuest

## Overview

KidneyQuest v1.0 builds a playable side-scrolling runner in six phases, following a POC-first approach: colored rectangles with working mechanics first (Phases 1-5), then real art and visual polish (Phase 6). Each phase delivers a verifiable slice of the game, building from a blank canvas to a fully themed, playable experience. The user is live-coding at a workshop, so speed and incremental progress matter.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Foundation** - HTML canvas, ES Modules, config, input, and responsive scaling
- [ ] **Phase 2: Player + Physics** - Chibi zebra player with gravity-based jump mechanics
- [ ] **Phase 3: Game Loop + Scrolling** - State machine, render loop, and scrolling ground
- [ ] **Phase 4: Obstacles + Collision** - Obstacle spawning, AABB collision, and game over state
- [ ] **Phase 5: Collectibles + Scoring** - Gene pickups, score display, difficulty ramp, and restart
- [ ] **Phase 6: Visual Polish** - Sprites, parallax backgrounds, branding, and themed art

## Phase Details

### Phase 1: Foundation
**Goal**: Player can open index.html and see a centered game canvas with a start prompt, built on a clean ES Modules architecture
**Depends on**: Nothing (first phase)
**Requirements**: INFR-01, INFR-02, INFR-03, MECH-01, MECH-02, MECH-03
**Success Criteria** (what must be TRUE):
  1. Opening index.html in a browser displays a centered canvas with dark background -- no console errors
  2. "Press Space to Start" text is visible on the canvas
  3. Pressing Space or tapping the screen transitions the game away from the start screen
  4. All game constants (canvas size, physics values, speeds) live in a single config.js file
  5. Canvas scales to fit the browser viewport while maintaining aspect ratio
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md -- Project skeleton: config.js, index.html, style.css
- [x] 01-02-PLAN.md -- Interactive modules: input, renderer, main.js with animated start screen

### Phase 2: Player + Physics
**Goal**: A chibi zebra player character jumps with a satisfying gravity arc (double jump, variable height, coyote time) that works identically on 60Hz and 120Hz displays
**Depends on**: Phase 1
**Requirements**: MECH-05, MECH-06
**Success Criteria** (what must be TRUE):
  1. Pressing Space or ArrowUp (or tapping on mobile) makes the player character jump with a smooth gravity arc
  2. Player lands back on the ground and cannot jump again until grounded (except double-jump while airborne)
  3. Jump arc looks and feels identical on 60Hz and 120Hz displays (delta-time physics)
**Plans**: 2 plans

Plans:
- [ ] 02-01-PLAN.md -- Player physics core: player.js entity, jump mechanics, input upgrade, colored rectangle
- [ ] 02-02-PLAN.md -- Zebra sprite animation: sprite sheet, animation state machine, visual polish

### Phase 3: Game Loop + Scrolling
**Goal**: The game runs a continuous loop with a working five-state machine (READY, COUNTDOWN, RUNNING, PAUSED, GAME_OVER), the ground scrolls to create the illusion of running, and entity types are defined as rich data-driven arrays
**Depends on**: Phase 2
**Requirements**: MECH-04, INFR-05
**Success Criteria** (what must be TRUE):
  1. After pressing Start, the ground scrolls left continuously and the player character appears to run automatically
  2. Game transitions cleanly between READY, COUNTDOWN, RUNNING, PAUSED, and GAME_OVER states
  3. Entity types (obstacles, genes) are defined as data-driven arrays in config.js, not hardcoded in logic
**Plans**: 2 plans

Plans:
- [ ] 03-01-PLAN.md -- Config expansion (bold palette, rich entity arrays) and scrolling two-tone ground with dash markers
- [ ] 03-02-PLAN.md -- Five-state machine, countdown, pause/resume, game over with cooldown, distance HUD

### Phase 4: Obstacles + Collision
**Goal**: Obstacles spawn, scroll toward the player, and colliding with one ends the game with a score screen
**Depends on**: Phase 3
**Requirements**: MECH-07, MECH-08, MECH-12, MECH-15, INFR-04
**Success Criteria** (what must be TRUE):
  1. Rectangle obstacles spawn at intervals on the right side and scroll left toward the player
  2. Multiple obstacle types (kidney stone, blockage) appear with different sizes, defined in config
  3. Hitting an obstacle immediately triggers game over -- the game stops and shows a final score
  4. Collision detection uses AABB with a forgiving hitbox shrink so near-misses feel good
**Plans**: 2 plans

Plans:
- [ ] 04-01-PLAN.md -- Config expansion (obstacle types with hitbox/spawn data) and obstacle spawning/rendering system
- [ ] 04-02-PLAN.md -- AABB collision detection, near-miss flash, DYING state with death animation, game over overlay

### Phase 5: Collectibles + Scoring
**Goal**: Players collect floating genes for points, see their score during gameplay, can restart after game over, and face increasing difficulty
**Depends on**: Phase 4
**Requirements**: MECH-09, MECH-10, MECH-11, MECH-13, MECH-14, MECH-16
**Success Criteria** (what must be TRUE):
  1. Gene collectibles spawn, scroll left with a floating up-down motion, and disappear when collected
  2. Score (distance traveled + genes collected) displays on screen during gameplay
  3. Multiple gene types (PKD1, COL4A5, NPHS1) appear with different point values, defined in config
  4. Pressing Space or tapping on the game over screen restarts the game from scratch
  5. Game speed increases gradually over time, making the game progressively harder
**Plans**: 2 plans

Plans:
- [ ] 05-01-PLAN.md -- Config expansion (gene educational data, spawn/difficulty params) and gene spawning/collection/difficulty ramp
- [ ] 05-02-PLAN.md -- Live HUD, collection feedback (popups + flash), educational game over screen, localStorage high score, restart

### Phase 6: Visual Polish
**Goal**: The game replaces colored rectangles with real zebra sprites, kidney-themed art, parallax backgrounds, and CeRKiD branding
**Depends on**: Phase 5
**Requirements**: VIZP-01, VIZP-02, VIZP-03, VIZP-04, VIZP-05, VIZP-06, VIZP-07, VIZP-08
**Success Criteria** (what must be TRUE):
  1. The player character is a zebra with a visible run cycle animation and distinct jump/fall poses
  2. Obstacles and gene collectibles are rendered with kidney-themed sprites (genes have a glow effect)
  3. Background has multiple parallax layers scrolling at different speeds, creating visual depth
  4. Start screen displays CeRKiD branding/logo
  5. Game over screen shows a score breakdown (distance + genes collected) and best score
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Foundation | 2/2 | Complete | 2026-02-18 |
| 2. Player + Physics | 0/2 | Planned | - |
| 3. Game Loop + Scrolling | 0/2 | Planned | - |
| 4. Obstacles + Collision | 0/2 | Planned | - |
| 5. Collectibles + Scoring | 0/2 | Planned | - |
| 6. Visual Polish | 0/TBD | Not started | - |
