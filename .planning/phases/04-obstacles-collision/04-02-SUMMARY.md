---
phase: 04-obstacles-collision
plan: 02
subsystem: ui
tags: [canvas2d, collision, aabb, game-loop, state-machine, animation]

# Dependency graph
requires:
  - phase: 04-01
    provides: obstacles array, spawning system, drawObstacles, obstacle types with hitboxShrink/displayName
  - phase: 03-02
    provides: five-state machine (RUNNING/PAUSED/GAME_OVER), gameOverTimer, resetGame, triggerGameOver

provides:
  - AABB collision detection with per-type hitbox shrink (getHitbox, aabbOverlap, checkCollisions)
  - DYING state with 0.5s death animation (player flash + screen shake)
  - Near-miss detection with yellow flash overlay on player
  - Extended game over overlay: semi-transparent backdrop, killer obstacle name, distance score
  - triggerDeath function transitioning RUNNING -> DYING -> GAME_OVER
  - drawWithShake renderer function with linear amplitude decay
  - Full restart loop resetting all collision/death state cleanly

affects: [05-gene-collectibles, 06-visual-polish]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - AABB hitbox shrink pattern: separate getHitbox from aabbOverlap for composability
    - Canvas shake pattern: ctx.save/translate(random)/drawFn/restore inside drawWithShake
    - State-gated rendering: DYING state owns its own drawGround call inside shake wrapper

key-files:
  created: []
  modified:
    - js/main.js
    - js/renderer.js

key-decisions:
  - "DYING state draws ground inside drawWithShake callback -- main loop skips drawGround during DYING to avoid double-draw"
  - "deathTimer starts at 0 on collision; gameOverTimer reset to 0 on DYING->GAME_OVER transition (not on collision)"
  - "GAME_OVER overlay alpha applied in drawGameOver itself (not caller) -- renderer owns visual presentation"
  - "killerObstacleName passed as parameter to drawGameOver -- keeps renderer stateless (no module-level state)"
  - "nearMissTimer counts DOWN from NEAR_MISS_FLASH_DURATION (set on near-miss, decremented each RUNNING frame)"

patterns-established:
  - "Collision detection: getHitbox(entity, shrink) + aabbOverlap(a, b) composable pattern"
  - "Screen shake: drawWithShake(ctx, config, timer, drawFn) wrapper pattern"
  - "Death sequence: RUNNING -> triggerDeath -> DYING (flash+shake) -> GAME_OVER (overlay+score)"

# Metrics
duration: 2min
completed: 2026-02-18
---

# Phase 4 Plan 02: Collision Detection + Death Animation Summary

**AABB collision with per-type hitbox shrink, 0.5s DYING state (player flash + screen shake), near-miss yellow flash, and game over overlay showing killer obstacle name and distance score**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-18T10:42:15Z
- **Completed:** 2026-02-18T10:44:35Z
- **Tasks:** 1 (Task 2 is checkpoint)
- **Files modified:** 2

## Accomplishments

- AABB collision detection with per-type hitbox shrink makes near-misses feel exciting rather than unfair
- DYING state plays 0.5s death animation (player flashes on/off, screen shakes with linear decay) before transitioning to GAME_OVER
- Near-miss detection triggers a brief yellow flash overlay on the player when visual bounds overlap but hitboxes do not
- Game over overlay shows semi-transparent dark backdrop, "Game Over" in red, "Hit a [Obstacle Name]!" in orange, and distance score in white
- Full restart loop cleanly resets deathTimer, killerObstacleName, nearMissTimer alongside existing state

## Task Commits

1. **Task 1: Implement collision detection, near-miss, DYING state, and death animation** - `c739472` (feat)

**Plan metadata:** pending (docs commit after checkpoint approval)

## Files Created/Modified

- `js/main.js` - Added getHitbox, aabbOverlap, checkCollisions, triggerDeath; DYING state branch; collision wired into RUNNING; deathTimer/killerObstacleName/nearMissTimer state; resetGame/handleAction/window.__game extended; drawWithShake import
- `js/renderer.js` - Added drawWithShake export; extended drawGameOver signature and rendering (overlay, killer name, distance, updated restart prompt)

## Decisions Made

- **DYING state owns drawGround**: The main loop skips the unconditional `drawGround` call during DYING, letting `drawWithShake`'s callback draw it at the shaken position. Prevents double-draw artifact.
- **gameOverTimer reset at DYING->GAME_OVER transition**: The cooldown for restart starts when GAME_OVER begins (after death animation), not when the collision occurs. This gives the full cooldown after the overlay appears.
- **killerObstacleName as parameter to drawGameOver**: Keeps renderer.js stateless -- the renderer never reads game state directly. Consistent with existing pattern for gameOverTimer/distance parameters.
- **nearMissTimer counts down**: Set to NEAR_MISS_FLASH_DURATION on near-miss detection, decremented each RUNNING frame. Simple and predictable.

## Deviations from Plan

**1. [Rule 3 - Blocking] DYING state double-draws ground without fix**

- **Found during:** Task 1 (game loop implementation)
- **Issue:** Main loop called drawGround unconditionally before state dispatch. DYING state also called drawGround inside drawWithShake callback. This would draw the ground twice -- once without shake, once with.
- **Fix:** Wrapped the unconditional drawGround in `if (gameState !== 'DYING')` guard so DYING state exclusively controls ground rendering via its shake wrapper.
- **Files modified:** js/main.js
- **Verification:** Code inspection confirms single draw path per frame for each state
- **Committed in:** c739472 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Fix was required for correct visual output during death animation. No scope creep.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 4 fully complete: obstacles spawn, scroll, collide, and trigger satisfying death sequence
- Phase 5 (Gene Collectibles) can safely add gene pickups to the RUNNING state alongside obstacle collision
- CONFIG collision/death values are all tunable in browser console for workshop use
- window.__game now exposes deathTimer, killerObstacleName, nearMissTimer for console inspection

---
*Phase: 04-obstacles-collision*
*Completed: 2026-02-18*
