---
phase: 04-obstacles-collision
plan: 01
subsystem: gameplay
tags: [canvas2d, obstacle-spawning, weighted-random, delta-time, progressive-difficulty]

# Dependency graph
requires:
  - phase: 03-game-loop-scrolling
    provides: scrolling ground, five-state machine, CONFIG pattern, game loop with deltaTime
  - phase: 02-player-physics
    provides: player object, GROUND_Y constant, CANVAS_WIDTH/HEIGHT constants
provides:
  - Three obstacle types (kidney-stone, toxin, salt-crystal) fully defined in CONFIG with hitboxShrink, placement, floatHeight, spawnWeight, unlockAfter
  - Obstacle spawning system with delta-time accumulator and remainder preservation
  - Progressive type unlocking (kidney stones from start, toxins at 10s, salt crystals at 20s)
  - Cluster spawning (25% probability, 1-2 extra staggered obstacles)
  - Floating obstacle support (salt crystal positioned above ground at floatHeight px)
  - drawObstacles renderer function for colored rectangle drawing
  - Phase 4 CONFIG constants: spawn timing, cluster params, hitbox shrink, death animation, near-miss, game-over overlay
affects: [04-02-collision-detection, 05-collectibles, 06-visual-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Data-driven obstacle types via CONFIG.OBSTACLE_TYPES array (workshop-console-mutable)
    - Weighted random selection with spawnWeight property
    - Delta-time accumulator with remainder preservation (spawnTimer -= spawnInterval, not = 0)
    - Progressive difficulty via unlockAfter + FLOAT_UNLOCK_ELAPSED thresholds
    - Cluster spawning with staggered X positions (CANVAS_WIDTH + i * CLUSTER_GAP + width + 10)

key-files:
  created: []
  modified:
    - js/config.js
    - js/main.js
    - js/renderer.js

key-decisions:
  - "OBSTACLE_TYPES replaced from Phase 3 placeholder (3 entries with spawnRate/movement) to full Phase 4 spec (hitboxShrink, placement, floatHeight, spawnWeight, unlockAfter, displayName)"
  - "Spawn X set to CANVAS_WIDTH + type.width + 10 (not just CANVAS_WIDTH) to ensure full off-screen clearance before any collision check in Plan 02"
  - "spawnTimer -= spawnInterval (not = 0) to preserve remainder for accurate timing"
  - "obstacles drawn after ground, before player in all active states (standard runner convention)"
  - "drawObstacles added to PAUSED and GAME_OVER states to freeze obstacles visually in place"
  - "window.__game extended with obstacles, gameElapsed, spawnTimer for workshop console inspection"

patterns-established:
  - "Obstacle state: flat object {type, displayName, x, y, width, height, color, hitboxShrink}"
  - "All obstacle config in CONFIG.OBSTACLE_TYPES -- no hard-coded values in spawn functions"
  - "Filter pattern: availableTypes = CONFIG.OBSTACLE_TYPES.filter(t => unlockAfter <= elapsed && placement check)"

# Metrics
duration: ~18min
completed: 2026-02-18
---

# Phase 4 Plan 1: Obstacles - Spawn System Summary

**Data-driven obstacle spawning with three progressively unlocked types (brown stone, green toxin, light-blue salt crystal) scrolling left as colored rectangles with weighted random cluster spawning**

## Performance

- **Duration:** ~18 min
- **Started:** 2026-02-18
- **Completed:** 2026-02-18
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Full Phase 4 OBSTACLE_TYPES config with hitboxShrink, placement, floatHeight, spawnWeight, unlockAfter, displayName for all three obstacle types
- All Phase 4 CONFIG constants added: spawn timing, cluster params, PLAYER_HITBOX_SHRINK, death animation, near-miss, game-over overlay
- Obstacle spawning system with delta-time accumulator, progressive type unlocking, and cluster spawning
- drawObstacles renderer function draws colored rectangles with Math.round for crisp pixel edges
- Obstacles freeze during PAUSED and GAME_OVER states, clear on game restart

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand config.js with full obstacle type data and Phase 4 constants** - `1234a19` (feat)
2. **Task 2: Implement obstacle spawning, movement, rendering, and wire into game loop** - `65aacf1` (feat)

## Files Created/Modified

- `js/config.js` - Replaced OBSTACLE_TYPES placeholder with 3 full Phase 4 entries; added spawn timing, cluster, hitbox, death animation, near-miss, and game-over overlay constants
- `js/main.js` - Added obstacle state variables, weightedRandom/createObstacle/updateSpawning/updateObstacles helpers, wired into RUNNING state, draw in PAUSED/GAME_OVER, extended resetGame, exposed in window.__game
- `js/renderer.js` - Added drawObstacles exported function (fillRect per obstacle, Math.round for crispness)

## Decisions Made

- Spawn X = `CANVAS_WIDTH + type.width + 10`: ensures obstacles are fully off-screen before entering collision check range in Plan 02; prevents false positives at spawn edge
- `spawnTimer -= spawnInterval` (not `= 0`): preserves fractional remainder for accurate timing at all frame rates; avoids accumulated timing drift
- Obstacles drawn after ground, before player: standard runner convention (player appears in front of obstacles)
- All obstacle CONFIG values kept mutable (no freeze): workshop participants can tweak `CONFIG.SPAWN_BASE_INTERVAL`, `CONFIG.OBSTACLE_TYPES[2].unlockAfter`, etc. live in the browser console

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Obstacle spawning complete and visible; ready for Plan 02 collision detection
- `hitboxShrink` field on every obstacle and `CONFIG.PLAYER_HITBOX_SHRINK` already defined for Plan 02 AABB collision math
- All death animation constants (DEATH_ANIMATION_DURATION, DEATH_FLASH_INTERVAL, SHAKE_AMPLITUDE, etc.) pre-defined in CONFIG for Plan 02 DYING state
- No blockers or concerns

---
*Phase: 04-obstacles-collision*
*Completed: 2026-02-18*
