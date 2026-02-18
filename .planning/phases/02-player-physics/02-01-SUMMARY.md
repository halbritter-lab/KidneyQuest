# Phase 02 Plan 01: Player Physics Core Summary

**Phase:** 02-player-physics
**Status:** Complete
**Completed:** 2026-02-18
**Duration:** ~25 min

## What Was Built

Implemented the complete player physics entity for KidneyQuest as a factory-function module (`player.js`). The player is a green (CONFIG.PLAYER_COLOR) rectangle that jumps with a smooth gravity arc, supports double jump (85% first-jump velocity), variable jump height via jump-cut on early release, coyote time (0.1s grace period after leaving ground), and asymmetric gravity (1.6x multiplier during fall for snappy descent). Landing triggers a squash/stretch deformation (squashX: 1.3, squashY: 0.7) that springs back over ~0.1s. The player moves horizontally via ArrowLeft/ArrowRight with soft bounce at zone edges (CONFIG.PLAYER_BOUNCE_FORCE). All physics constants live in `config.js` and are tunable live via `window.CONFIG` in the browser console. The old broken class-based `player.js` (which used invalid named imports from `export default`) was fully replaced.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Create player.js entity and upgrade config.js + input.js | 0c90491 | js/player.js, js/config.js, js/input.js |
| 2 | Wire player into main.js and add drawPlayer to renderer.js | 5cbaa2e | js/main.js, js/renderer.js |

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Factory function pattern for player (not class) | Consistent with project workshop aesthetic; plain objects are easier to inspect and mutate in browser console; no `this` binding issues |
| CONFIG imported directly in player.js (not passed as arg to updatePlayer) | updatePlayer is called every frame -- avoiding an extra parameter reduces call-site verbosity; CONFIG is already globally mutable via window.CONFIG |
| Bounce at zone right edge uses `player.x + PLAYER_WIDTH > ZONE_RIGHT` | Accounts for player width correctly; otherwise the right edge of the rectangle would escape the zone |
| `Object.assign(player, createPlayer(CONFIG))` for restart reset | player is `const` so can't reassign; Object.assign mutates in place without breaking existing references; clean and explicit |
| setupMovement function in main.js (not input.js) | Keeps input.js focused on the action callback pattern; horizontal movement is keyboard-only by design (CONTEXT.md: mobile only gets jump via tap) |
| drawPlayer squash/stretch anchored at bottom-centre | Squash pushes the player outward horizontally and compresses downward from the feet, which looks natural for a landing; anchoring at top would invert the visual |
| Coyote time checks `coyoteTimer > 0 && jumpsRemaining === 2` atomically | Prevents coyote time from consuming the second (double) jump; the timer only applies to the first jump |

## Deviations from Plan

None -- plan executed exactly as written. The old broken player.js (class-based with invalid named imports) was already identified in the plan and replaced as specified.

## Issues

None.

## Next Phase Readiness

Phase 2 Plan 02 (sprite animation) can proceed immediately. It will:
- Add a sprite sheet and frame-based animation on top of the existing `animState` and `animFrame` fields already tracked in player state
- The `drawPlayer` function in `renderer.js` will be extended or replaced to draw sprite frames instead of a solid rectangle
- All physics and jump mechanics from this plan remain unchanged in Plan 02
