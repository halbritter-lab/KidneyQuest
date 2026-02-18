# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Playable, fun, and simple enough for workshop participants to understand and modify
**Current focus:** Phase 2 complete -- Phase 3 (Game Loop + Scrolling) is next

## Current Position

Phase: 2 of 6 (Player Physics) -- Complete
Plan: 2 of 2 in phase (all plans complete)
Status: Complete
Last activity: 2026-02-18 -- Completed Phase 2 (Player + Physics)

Progress: [████░░░░░░] ~33%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: ~25 min
- Total execution time: ~1.5 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2 | ~40 min | ~20 min |
| 02-player-physics | 2 | ~55 min | ~28 min |

**Recent Trend:**
- Last 5 plans: 01-01, 01-02, 02-01, 02-02
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
- [02-02]: ANIM_STATES internal to player.js (not exported) -- renderer receives animState + animFrame as params
- [02-02]: Procedural Canvas 2D drawing (not sprite sheet) -- workshop-friendly, zero external assets
- [02-02]: try-catch fallback to colored rectangle in drawPlayer -- graceful degradation
- [02-02]: Chibi proportions (60% head, 25% body, 15% legs) -- cute and readable at game scale
- [02-02]: doubleJump uses ctx.rotate for spin effect -- simple to implement, visually distinct

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed Phase 2 (Player + Physics) -- all plans verified
Resume file: None
