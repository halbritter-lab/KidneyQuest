---
phase: 05-collectibles-scoring
plan: 01
subsystem: ui
tags: [canvas2d, game-loop, collectibles, scoring, difficulty-ramp, sine-animation, aabb-collision]

# Dependency graph
requires:
  - phase: 04-obstacles-collision
    provides: AABB collision helpers, obstacle spawning system, death animation, game state machine

provides:
  - Gene collectibles (PKD1, COL4A5, NPHS1) spawning from right edge with floating sine animation
  - AABB collection detection (no hitbox shrink) awarding points on player overlap
  - Score state tracking (geneScore, collectedGenes) accumulating internally
  - Difficulty ramp: currentSpeed increments each RUNNING frame, all movement scales uniformly
  - Full educational gene type data (diseaseName, description, inheritance, omimId, omimUrl, geneReviewsUrl)

affects: [05-02-collectibles-scoring, 06-visual-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Gene collectibles use baseY + sin(floatPhase) absolute position to prevent float drift"
    - "Per-gene floatPhase offset (random initial phase) ensures genes float out of sync visually"
    - "currentSpeed replaces CONFIG.GAME_SPEED for all movement -- single variable controls global speed"
    - "geneSpawnTimer -= interval (not = 0) preserves remainder for accurate delta-time accumulation"

key-files:
  created: []
  modified:
    - js/config.js
    - js/main.js
    - js/renderer.js

key-decisions:
  - "[05-01]: GENE_TYPES reduced from 6 to 3 entries (PKD1, COL4A5, NPHS1) with full Phase 5 educational fields"
  - "[05-01]: SPEED_INCREMENT reduced from 5 to 2 -- gentler ramp, ~150s to reach MAX_SPEED from 200px/s"
  - "[05-01]: Gene AABB uses full player/gene bounds (no hitbox shrink) -- collection should feel generous"
  - "[05-01]: Gene spawn Y randomised between 220-350px -- covers mid-air through near-ground zone"
  - "[05-01]: currentSpeed as single module-level variable -- all movement (ground, obstacles, genes, distance) uses it"
  - "[05-01]: Genes drawn after obstacles and before player in all rendering states"

patterns-established:
  - "Absolute float position: gene.y = gene.baseY + sin(floatPhase) * AMP (never additive delta)"
  - "Score state internal: geneScore/collectedGenes tracked but not displayed until Plan 02 HUD"
  - "All movement references currentSpeed, not CONFIG.GAME_SPEED, to enable uniform difficulty scaling"

# Metrics
duration: 22min
completed: 2026-02-18
---

# Phase 5 Plan 01: Collectibles Scoring - Core Mechanics Summary

**Three gene collectibles (PKD1, COL4A5, NPHS1) spawn with floating sine animation, AABB collection detection, score state, and uniform difficulty ramp via currentSpeed**

## Performance

- **Duration:** ~22 min
- **Started:** 2026-02-18T (session start)
- **Completed:** 2026-02-18
- **Tasks:** 2/2
- **Files modified:** 3

## Accomplishments

- Gene collectibles float across screen with per-gene phase-offset sine animation (no sync drift)
- Player-gene AABB collision removes gene and awards points; score tracked in geneScore/collectedGenes
- Difficulty ramp increments currentSpeed each RUNNING frame; all movement (ground markers, obstacles, genes, distance counter) uniformly scales
- Full educational data added to GENE_TYPES (diseaseName, description, inheritance, OMIM IDs, external URLs) ready for Phase 5 Plan 02 game-over education screen

## Task Commits

Each task was committed atomically:

1. **Task 1: Expand config.js with gene educational data and Phase 5 constants** - `c08c38d` (feat)
2. **Task 2: Implement gene spawning, floating animation, collection, difficulty ramp, and rendering** - `b14d478` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `js/config.js` - GENE_TYPES replaced with 3 Phase 5 entries (educational fields), Phase 5 constants added, SPEED_INCREMENT reduced to 2
- `js/main.js` - Gene state vars, 6 helper functions (createGene, updateGenes, updateGeneSpawning, checkGeneCollisions, onGeneCollected, updateDifficultyRamp), all movement switched to currentSpeed, genes wired into game loop and all render states
- `js/renderer.js` - drawGenes exported function: colored rectangles with white border and name label

## Decisions Made

- GENE_TYPES replaced from 6 placeholder entries to 3 Phase 5 entries (PKD1, COL4A5, NPHS1) - reduces cognitive load for workshop participants and ensures each type has meaningful educational differentiation
- SPEED_INCREMENT reduced from 5 to 2 - original ramp reached MAX_SPEED in ~60s which was too aggressive; 2 gives a ~150s ramp that lets players experience more gene collection before the game becomes frenetic
- Gene AABB uses full bounds (no hitbox shrink unlike obstacles) - collection should feel rewarding and generous, not punishing
- `currentSpeed` as a single module-level variable replaces CONFIG.GAME_SPEED in all movement code - makes the difficulty ramp automatically apply to everything without per-function changes
- PX_PER_METER duplicate avoided - config.js already had it at value 10, plan task notes correctly identified this

## Deviations from Plan

None - plan executed exactly as written. The note about PX_PER_METER already existing was correctly handled as specified in the task instructions.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Gene collectibles fully functional: spawn, float, collect, score state accumulates
- `collectedGenes` array populated on each collection ready for game-over education screen (Plan 02)
- `geneScore` ready to be displayed in HUD (Plan 02)
- `currentSpeed` exposed via `window.__game.currentSpeed` for workshop console inspection
- Plan 02 can add: collection popup effects, gene name HUD flash, game-over education screen, high score tracking, restart flow

---
*Phase: 05-collectibles-scoring*
*Completed: 2026-02-18*
