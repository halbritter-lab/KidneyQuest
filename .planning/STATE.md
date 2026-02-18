# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Playable, fun, and simple enough for workshop participants to understand and modify
**Current focus:** Phase 2 in progress -- Plan 01 (Player Physics Core) complete

## Current Position

Phase: 2 of 6 (Player Physics) -- In progress
Plan: 1 of 2 in phase (Plan 01 complete, Plan 02 remaining)
Status: In progress
Last activity: 2026-02-18 -- Completed 02-01-PLAN.md (Player Physics Core)

Progress: [███░░░░░░░] ~25%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: ~22 min
- Total execution time: ~0.9 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2 | ~40 min | ~20 min |
| 02-player-physics | 1 | ~25 min | ~25 min |

**Recent Trend:**
- Last 5 plans: 01-01, 01-02, 02-01
- Trend: On track

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: POC-first approach -- colored rectangles with working mechanics (Phases 1-5) before visual polish (Phase 6)
- [Roadmap]: 6 phases derived from PLAN.md build order, matching the live workshop coding flow
- [01-01]: CONFIG uses `export default` flat object (not named exports) -- workshop console mutability intentional
- [01-01]: No Object.freeze on CONFIG -- workshop participants must tweak live values in browser console
- [01-01]: Canvas width/height NOT set in CSS -- JavaScript (Plan 02) sets dimensions from CONFIG values
- [01-01]: GROUND_Y set to 600 (1280x720 canvas; leaves 120px for player at bottom)
- [01-02]: keydown on canvas element (not window) -- scopes input to game, canvas tabindex="0" with auto-focus
- [01-02]: DevicePixelRatio capped at 2 -- avoids excessive GPU memory on 3x+ displays
- [01-02]: onAction callback pattern for input -- decouples input module from game state for Phase 2+ extensibility
- [01-02]: Ground drawn as filled area + bright top edge -- single-pixel lines invisible on high-DPI displays
- [01-02]: GROUND_LINE_COLOR added to config.js -- keeps ground styling tunable from browser console
- [01-02]: String state machine (READY/RUNNING/GAME_OVER) -- readable; avoids premature enum abstraction before Phase 5
- [02-01]: Factory function pattern for player (not class) -- plain objects easier to inspect/mutate in browser console
- [02-01]: CONFIG imported directly in player.js -- avoids extra updatePlayer parameter; CONFIG already globally mutable via window.CONFIG
- [02-01]: setupMovement in main.js (not input.js) -- keeps input.js focused on action callback pattern; horizontal movement is keyboard-only by design
- [02-01]: drawPlayer squash/stretch anchored at bottom-centre -- landing squash looks natural (compresses downward from feet)
- [02-01]: Coyote time checks `coyoteTimer > 0 && jumpsRemaining === 2` atomically -- prevents coyote time consuming double jump
- [02-01]: Object.assign(player, createPlayer(CONFIG)) for restart reset -- player is const; mutates in place without breaking references

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 02-01-PLAN.md (Player Physics Core) -- Phase 2 Plan 1 of 2 complete
Resume file: None
