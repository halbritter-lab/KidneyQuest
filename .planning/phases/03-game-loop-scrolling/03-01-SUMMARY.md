# Phase 03 Plan 01: Config Expansion and Scrolling Ground Summary

**Phase:** 03-game-loop-scrolling
**Plan:** 01
**Subsystem:** rendering / config
**Status:** Complete
**Completed:** 2026-02-18
**Duration:** ~15 min

---

## One-liner

Bold blue-grey ground with data-driven config: scrolling dash markers at 60 px/s (READY) and 200 px/s (RUNNING) via `drawGround(ctx, config, groundOffset)` two-segment tile loop.

---

## What Was Built

Expanded `config.js` with a bold playful color palette, ground marker parameters, scroll speed config, HUD/countdown/game-over constants, and richly annotated entity arrays. Replaced the static `drawGroundLine` with `drawGround(ctx, config, groundOffset)` that renders a two-tone earth band (medium blue-grey fill + bright blue surface line) plus scrolling dash markers that shift left each frame. The module-level `groundOffset` accumulator in `main.js` increments at `READY_SCROLL_SPEED` on the start screen (slow idle hint) and at `GAME_SPEED` during play, creating a seamless motion illusion. All Phase 1/2 functionality is preserved.

---

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Expand config with bold palette, ground markers, rich entity arrays | 30402a9 | js/config.js |
| 2 | Replace static ground with scrolling two-tone ground and dash markers | be196f7 | js/renderer.js, js/main.js |

---

## Files Created / Modified

**Modified:**
- `js/config.js` -- Bold color palette, 5 ground marker keys, READY_SCROLL_SPEED, HUD_COLOR, PX_PER_METER, countdown config, game-over config, 3-type OBSTACLE_TYPES, 6-gene GENE_TYPES with educational descriptions
- `js/renderer.js` -- `drawGroundLine` replaced by `drawGround(ctx, config, groundOffset)` with two-tone fill + scrolling dash markers
- `js/main.js` -- Import updated, `groundOffset` accumulator added, game loop branches on state for scroll speed

---

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| `groundOffset` as module-level `let` in main.js | Keeps state local to the game loop; no need to add to player or config objects |
| `groundOffset % spacing` phase calculation | Standard tile-scroll technique; avoids ever-growing offset causing float precision loss at very large values |
| `Math.round(x)` for marker x position | Ensures pixel-crisp edges on all display densities; no sub-pixel blur on integer-positioned rects |
| READY_SCROLL_SPEED = 60 (~30% of GAME_SPEED) | Subtle idle hint: markers visibly move but feel calm; full speed starts only when game begins |
| GROUND_COLOR '#2C5F8A' (medium blue-grey) | Provides visual contrast to deep navy background while reading as earthy substrate |
| GROUND_LINE_COLOR '#4A90D9' (bright blue) | Distinct, high-contrast surface line; reads clearly against both earth band and background |
| GROUND_MARKER_COLOR '#3A78C2' (slightly darker than surface line) | Subtle enough not to compete with surface line, still readable as motion indicator |
| All new config values added as flat keys (no Object.freeze) | Consistent with existing workshop-console-mutable decision from Phase 1 |
| Gene types include `geneName`, `geneDescription` fields | Educational scaffold for Phase 4+ tooltip/panel UI without requiring schema changes later |
| OBSTACLE_TYPES gained `spawnRate` and `movement` fields | Phase 4 spawner can select and drive entities purely from config data, never by array index |

---

## Deviations from Plan

None - plan executed exactly as written.

---

## Issues Encountered

None.

---

## Performance

- Task 1 (config.js): ~5 min
- Task 2 (renderer.js + main.js): ~8 min
- SUMMARY + STATE: ~2 min
- Total: ~15 min

---

## Next Phase Readiness

Phase 3 Plan 02 (game loop state machine: countdown, score, game over) can proceed immediately. The following foundations are in place:

- `COUNTDOWN_STEP`, `COUNTDOWN_COLOR`, `COUNTDOWN_GO_COLOR` -- countdown parameters ready
- `GAME_OVER_FREEZE_DELAY`, `GAME_OVER_COOLDOWN`, `GAME_OVER_COLOR`, `FLASH_INTERVAL` -- game-over parameters ready
- `HUD_COLOR`, `PX_PER_METER` -- distance HUD parameters ready
- `groundOffset` accumulates scroll distance and can drive speed acceleration in Plan 02
- `drawGround` already reads `GAME_SPEED` per frame, ready for `currentSpeed` variable introduction
