# Phase 4: Obstacles + Collision - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Obstacle spawning, scrolling, AABB collision detection, and game over state. Three obstacle types scroll toward the player; colliding with one triggers a brief death moment and game over overlay with score. Basic restart included. Collectibles, scoring breakdown, and difficulty ramp belong to Phase 5. Sprites and themed art belong to Phase 6.

</domain>

<decisions>
## Implementation Decisions

### Obstacle types & appearance
- 3 obstacle types: **Kidney Stone**, **Toxin**, **Salt Crystal**
- Chosen for kidney health theme without targeting specific rare diseases (avoids villainizing conditions patients live with, since gene collectibles already reference PKD1/COL4A5/NPHS1)
- Each type has a distinct color as a colored rectangle (e.g., brown stone, green toxin, white/light-blue salt)
- No text labels on obstacles during gameplay — visual distinction by color only
- Types defined as data-driven config entries with color, size ranges, and spawn parameters

### Obstacle placement
- Both ground-level and floating obstacles
- Ground obstacles: player jumps over them
- Floating obstacles: positioned at jump height, forcing the player to time when NOT to jump
- Floating obstacles introduced only after ground obstacles are established (~15-20s in)

### Spawn patterns & pacing
- Rhythmic base interval with random variation — feels fair and learnable, but not boring
- Clusters of 2-3 obstacles allowed for exciting skill-test moments
- Progressive type introduction: stones first, toxins after ~10s, salt crystals after ~20s
- All spawn timing values defined in config for workshop tweakability

### Collision feel & forgiveness
- AABB collision with moderate hitbox shrink (~15-20%)
- Uniform shrink (same percentage on all sides)
- Different shrink values per obstacle type (e.g., tall salt crystals can be more forgiving)
- Per-type shrink values defined in config
- Subtle color flash on near-miss (survived but close) — adds excitement

### Death & game over transition
- On collision: brief death animation (~0.5s) — player flashes/shakes + screen shake
- Game freezes after death animation
- Game over displays as semi-transparent overlay on the frozen game state
- Overlay shows: score (distance traveled) AND which obstacle type ended the run (e.g., "Hit a Kidney Stone!")
- Basic restart: press Space on game over screen to play again (Phase 5 expands this)

### Claude's Discretion
- Exact colors for each obstacle type
- Precise spawn interval ranges and cluster probability
- Screen shake intensity and duration
- Near-miss detection threshold (how close counts as "near")
- Death animation specifics (flash pattern, shake amplitude)
- Overlay styling (transparency level, text positioning)

</decisions>

<specifics>
## Specific Ideas

- Obstacle types designed around kidney health education: stones (mineral buildup), toxins (waste kidneys filter), salt (dietary sodium) — all universally understood threats, not disease-specific symptoms
- The narrative: zebra (rare disease symbol) overcomes kidney health threats while collecting research genes — empowering, educational, patient-respectful
- Progressive introduction teaches each obstacle type before mixing them — mirrors good game tutorial design
- Floating obstacles add strategic depth beyond "just jump over everything"

</specifics>

<deferred>
## Deferred Ideas

- Obstacle-specific point deductions — Phase 5 handles all scoring mechanics
- Obstacle animations (spinning, pulsing) — Phase 6 visual polish
- Obstacle sound effects — not in current roadmap scope

</deferred>

---

*Phase: 04-obstacles-collision*
*Context gathered: 2026-02-18*
