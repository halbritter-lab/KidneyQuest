# Phase 03 Plan 02: Five-State Machine Summary

**Phase:** 03-game-loop-scrolling
**Plan:** 02
**Subsystem:** game loop / state machine / rendering
**Status:** Complete
**Completed:** 2026-02-18
**Duration:** ~25 min

---

## One-liner

Complete five-state game lifecycle (READY -> COUNTDOWN -> RUNNING -> PAUSED -> GAME_OVER) with 3-2-1-Go! countdown, delta-time-safe pause/resume, game over with flash + cooldown, distance HUD, and per-state ground scroll speeds.

---

## What Was Built

Extended `input.js` with a fourth `onPause` callback parameter for Escape/P key handling. Rewrote `main.js` with a full five-state machine: READY shows the start screen with slow ground scroll; Space triggers COUNTDOWN which runs a 3-2-1-Go! sequence using delta-time accumulators (no setTimeout); RUNNING tracks distance and scrolls ground at full GAME_SPEED; PAUSED freezes all state with delta-time-safe resume (lastTime=0 reset); GAME_OVER flashes the player for 1s, shows "Game Over" text, then a pulsing restart prompt after an additional 1s cooldown. Added four new renderer functions: `drawCountdown` (pulsing numbers in gold/green), `drawPauseOverlay` (dimmed screen with PAUSED text), `drawGameOver` (phased reveal with flash/text/prompt), and `drawHUD` (gold distance counter top-right). Exposed `window.__game` getters and `window.triggerGameOver` for testing and workshop debugging. All 37 Playwright automated checks passed.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Extend input.js with pause callback and implement five-state machine in main.js | 4c65eeb | js/input.js, js/main.js |
| 2 | Add countdown, pause overlay, game over, and HUD renderer functions | 386c0a2 | js/renderer.js |

---

## Files Created / Modified

**Modified:**
- `js/input.js` -- Extended `setupInput` with 4th `onPause` parameter (default no-op) for Escape/P key handling; existing callers unaffected
- `js/main.js` -- Five-state machine (READY/COUNTDOWN/RUNNING/PAUSED/GAME_OVER), countdown logic with delta-time accumulator, pause toggle with lastTime=0 safety, game over with freeze delay + cooldown, distance tracking, per-state ground scroll speeds, `window.__game` state exposure for testing
- `js/renderer.js` -- Four new exported functions: `drawCountdown`, `drawPauseOverlay`, `drawGameOver`, `drawHUD`; all existing functions unchanged

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `onPause` as 4th parameter with default no-op | Backward-compatible; keeps input.js focused on action callback pattern while adding pause support |
| `lastTime = 0` on both pause entry AND resume | CRITICAL for delta-time safety -- prevents huge delta on resume; existing Math.min(0.1s) cap handles the first resumed frame |
| `gameOverTimer >= FREEZE_DELAY + COOLDOWN` for restart accept | Cooldown starts after freeze delay, giving player time to see "Game Over" text before restart is available |
| `window.triggerGameOver` exposed globally | Allows Phase 4 collision to trigger game over, and workshop participants to test manually |
| `window.__game` with getter properties | Exposes read-only view of game state for testing and workshop debugging without polluting module scope |
| Ground freezes in PAUSED and GAME_OVER | Visual feedback that game is stopped; matches player expectation |
| Player drawn during COUNTDOWN (physics ticking) | Player visible and idle during countdown; physics prevents float on resume to RUNNING |
| Flash effect via Math.floor(timer/FLASH_INTERVAL) % 2 toggle | Simple even/odd frame toggle; no extra state needed |

---

## Deviations from Plan

| Deviation | Reason |
|-----------|--------|
| Added `onActionRelease` as 3rd parameter to `setupInput` (onPause becomes 4th) | Phase 2 already added jump release handling; plan specified 3rd param for onPause but existing code had 3 params already |
| Added `window.__game` state exposure | Needed for automated Playwright verification; also useful for workshop debugging |
| Player drawn and updated during COUNTDOWN state | Plan mentioned "Phase 2+ will add player" but player.js already exists from Phase 2; natural to include |

---

## Issues Encountered

None -- all 37 Playwright automated checks passed on first run.

---

## Verification

Automated Playwright verification (test-phase3.mjs) confirmed:
- READY state: correct initial state, ground scrolls slowly
- Config: 6 gene types, 3 obstacle types, all with required fields
- COUNTDOWN: Space triggers countdown starting at 3, decrements correctly, Space ignored
- RUNNING: distance increases, ground scrolls at ~GAME_SPEED, jump works
- PAUSED: Escape/P toggles pause, ground and distance frozen, Space ignored
- Resume: smooth with no delta-time spike
- GAME_OVER: triggerGameOver works, ground frozen, cooldown enforced, restart works
- Full cycle: READY -> COUNTDOWN -> RUNNING -> GAME_OVER -> READY verified
- Zero console errors

---

## Performance

- Task 1 (input.js + main.js): ~12 min
- Task 2 (renderer.js): ~8 min
- Checkpoint verification (Playwright): ~5 min
- SUMMARY: ~2 min
- Total: ~25 min

---

## Next Phase Readiness

Phase 4 (Obstacles + Collision) can proceed immediately. The following foundations are in place:

- Five-state machine with clean transitions and `window.triggerGameOver` for collision to call
- `window.__game` state exposure for future automated testing
- `OBSTACLE_TYPES` and `GENE_TYPES` arrays with rich data-driven fields (spawnRate, movement, educational descriptions)
- `distance` tracking ready for score calculation
- `drawHUD` ready for score display extension
- Player physics (jump, double jump, horizontal movement) fully integrated into RUNNING state
