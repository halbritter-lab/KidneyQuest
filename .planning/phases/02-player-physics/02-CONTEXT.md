# Phase 2: Player + Physics - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

A cute animated zebra player character with gravity-based jump mechanics that feel snappy and responsive, working identically on 60Hz and 120Hz displays. This phase delivers the player entity, sprite animation, physics system, and input handling — NOT obstacles, scrolling ground, or scoring.

**Key deviation from roadmap:** User decided to use an animated zebra sprite from Phase 2 onward instead of colored rectangles. Phase 6 visual polish scope will adjust accordingly.

</domain>

<decisions>
## Implementation Decisions

### Jump feel
- Snappy and quick — fast rise, fast fall (Mario-like, not floaty)
- Double jump enabled — player can jump once more while airborne
- Variable jump height — short tap = small hop, hold = full jump
- Coyote time enabled — ~100ms grace period to jump after leaving ground
- Delta-time physics required — jump arc must be identical on 60Hz and 120Hz

### Zebra sprite & animation
- Cute/chibi art style — big head, small body, expressive eyes
- Full animation state set: run cycle, jump, fall, idle, land (squash), and double-jump
- Sprites need to be created/found — researcher should investigate Gemini CLI for generation
- User suggested "nanano banana" plugin for Gemini image generation — researcher should verify and evaluate
- Size relative to canvas: Claude's discretion (researcher should investigate best practices for side-scrolling runners)

### Player movement
- Slight left/right horizontal movement within a zone (not fixed position)
- Soft bounce at screen edges — zebra gently pushed back, not hard stop
- Player positioned roughly ~25% from left edge as default running position

### Ground & play area
- Visible ground line (colored line or simple surface, not invisible)
- Ground height: Claude's discretion — researcher should investigate best practices and community standards for side-scrolling runner games
- Themed ground deferred to Phase 6

### Mobile touch
- Tap anywhere on screen to jump
- Hold duration affects jump height on mobile too (same as keyboard)
- Left/right movement is keyboard-only — mobile only gets jump via tap
- Lock down all default touch behaviors (scroll, zoom, bounce) on the canvas

### Claude's Discretion
- Exact zebra size relative to canvas (research best practices)
- Ground height position (research game design standards)
- Exact coyote time duration (~100ms suggested)
- Landing squash animation intensity
- Double-jump visual feedback (spark, flip, etc.)
- Horizontal movement speed and zone boundaries

</decisions>

<specifics>
## Specific Ideas

- Zebra should be cute/chibi style — approachable for a workshop/educational game audience
- Investigate using Gemini CLI for sprite generation — user mentioned "nanano banana" plugin as potentially good for image generation
- Jump should feel like classic Mario — responsive and tight, not floaty
- The game is live-coded at a workshop, so the sprite approach needs to be reproducible/explainable

</specifics>

<deferred>
## Deferred Ideas

- Themed ground (kidney/medical pattern) — Phase 6: Visual Polish
- Phase 6 scope may narrow since zebra sprites are now in Phase 2

</deferred>

---

*Phase: 02-player-physics*
*Context gathered: 2026-02-18*
