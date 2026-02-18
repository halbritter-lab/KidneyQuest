# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-17)

**Core value:** Playable, fun, and simple enough for workshop participants to understand and modify
**Current focus:** Phase 5 (Collectibles + Scoring) -- Plan 1 of 2 complete

## Current Position

Phase: 5 of 6 (Collectibles + Scoring) -- In progress
Plan: 1 of 2 in phase (05-01 complete)
Status: In progress
Last activity: 2026-02-18 -- Completed 05-01-PLAN.md (gene collectibles + difficulty ramp)

Progress: [███████░░░] ~75%

## Performance Metrics

**Velocity:**
- Total plans completed: 9 (01-01, 01-02, 02-01, 02-02, 03-01, 03-02, 04-01, 04-02, 05-01)
- Average duration: ~22 min
- Total execution time: ~3.3 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2 | ~40 min | ~20 min |
| 02-player-physics | 2 | ~55 min | ~28 min |
| 03-game-loop-scrolling | 2/2 | ~40 min | ~20 min |
| 04-obstacles-collision | 2/2 | ~54 min | ~27 min |
| 05-collectibles-scoring | 1 (of 2) | ~22 min | ~22 min |

**Recent Trend:**
- Last 5 plans: 03-02, 04-01, 04-02, 05-01
- Trend: Stable (~20-27 min per plan)

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
- [03-01]: groundOffset as module-level let in main.js -- keeps scroll state local to game loop; no need to add to player/config objects
- [03-01]: groundOffset % spacing phase calculation -- standard tile-scroll technique; prevents float precision loss at large offsets
- [03-01]: Math.round(x) for marker x position -- pixel-crisp edges on all display densities
- [03-01]: READY_SCROLL_SPEED = 60 (~30% of GAME_SPEED) -- subtle idle hint; calm at ready, full speed when running
- [03-02]: onPause as 4th param to setupInput with default no-op -- backward-compatible pause callback
- [03-02]: lastTime = 0 on both pause entry AND resume -- CRITICAL for delta-time safety
- [03-02]: gameOverTimer >= FREEZE_DELAY + COOLDOWN for restart -- cooldown starts after freeze delay
- [03-02]: window.__game getter properties -- read-only state exposure for testing and workshop debugging
- [03-02]: window.triggerGameOver exposed globally -- Phase 4 collision triggers game over, workshop manual testing
- [04-01]: OBSTACLE_TYPES replaced from Phase 3 placeholder to full Phase 4 spec (hitboxShrink, placement, floatHeight, spawnWeight, unlockAfter, displayName)
- [04-01]: Spawn X = CANVAS_WIDTH + type.width + 10 -- ensures full off-screen clearance before collision checks in Plan 02
- [04-01]: spawnTimer -= spawnInterval (not = 0) -- preserves remainder for accurate timing at all frame rates
- [04-01]: Obstacles drawn after ground, before player -- standard runner convention (player appears in front)
- [04-01]: drawObstacles called in PAUSED and GAME_OVER states -- obstacles freeze visually in non-running states
- [04-02]: DYING state draws ground inside drawWithShake callback -- main loop guards with `gameState !== 'DYING'` to prevent double-draw
- [04-02]: gameOverTimer reset to 0 at DYING->GAME_OVER transition -- cooldown starts when overlay appears, not when collision occurs
- [04-02]: killerObstacleName passed as parameter to drawGameOver -- renderer remains stateless, consistent with existing pattern
- [04-02]: nearMissTimer counts down from NEAR_MISS_FLASH_DURATION -- set on detection, decremented each RUNNING frame
- [05-01]: GENE_TYPES reduced from 6 to 3 entries (PKD1, COL4A5, NPHS1) with full Phase 5 educational fields (diseaseName, description, inheritance, omimId, omimUrl, geneReviewsUrl)
- [05-01]: SPEED_INCREMENT reduced from 5 to 2 -- gentler ramp, ~150s to reach MAX_SPEED from 200px/s
- [05-01]: Gene AABB uses full player/gene bounds (no hitbox shrink) -- collection should feel generous
- [05-01]: currentSpeed as single module-level variable -- all movement (ground, obstacles, genes, distance) uses it for uniform difficulty scaling
- [05-01]: gene.y = gene.baseY + sin(floatPhase) * AMP -- absolute position, not additive delta, prevents float drift
- [05-01]: Genes drawn after obstacles and before player in all rendering states

### Pending Todos

None.

### Blockers/Concerns

None.

## Session Continuity

Last session: 2026-02-18
Stopped at: Completed 05-01-PLAN.md (gene collectibles + difficulty ramp)
Resume file: None
