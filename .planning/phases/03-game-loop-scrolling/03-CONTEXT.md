# Phase 3: Game Loop + Scrolling - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Continuous game loop with a working state machine (READY → RUNNING → GAME_OVER) and scrolling ground that creates the illusion of running. Entity types defined as data-driven arrays in config.js. Does not include obstacle spawning, collision, scoring, or visual polish — those are later phases.

</domain>

<decisions>
## Implementation Decisions

### State transitions
- READY → RUNNING: Brief 3-2-1-Go! countdown before gameplay begins
- RUNNING → GAME_OVER: Brief death moment — player flashes or shakes, then freeze + "Game Over" text
- GAME_OVER → READY: Short cooldown (~1 second) before Space is accepted, prevents accidental restarts
- READY screen: Ground already scrolling slowly in the background to hint at runner gameplay
- Pause support: Escape or P pauses the game with a "Paused" overlay

### Ground & scrolling feel
- Two-tone ground: darker surface line on top, lighter earth band below
- Ground markers: small dashes or lines on the ground surface that scroll left, making movement visible even before obstacles exist
- Color palette: bold and playful — bright primary colors, high contrast, classic platformer energy
- Ground thickness: Claude's discretion — research best practices for ground-to-play-area ratio in side-scrolling runners

### Entity data structure
- Separate arrays in config: `config.obstacles = [...]` and `config.genes = [...]`
- Rich entity definitions with behavior hints: name, size, color, speed, spawnRate, movement pattern (e.g., 'float', 'static')
- Gene entities include educational info from the start: geneName, geneDescription, points
- Broader gene set (5-6 genes): PKD1, PKD2, COL4A5, NPHS1, NPHS2, WT1 — covering polycystic kidney disease, Alport syndrome, nephrotic syndrome, and Wilms tumor
- Obstacle types also defined in config with different sizes and behaviors

### Game pacing & base speed
- Starting pace: brisk run — noticeable speed from the start, feels exciting but manageable
- Game loop: variable timestep with delta-time (requestAnimationFrame + delta-time), adapts to any refresh rate
- Distance counter visible during gameplay — simple distance indicator in corner showing progress
- Difficulty ramp comes in Phase 5, base speed is constant for this phase

### Claude's Discretion
- Exact ground thickness ratio (research best practices)
- Ground marker style and spacing
- Specific color values within bold/playful palette
- Countdown animation style (3-2-1-Go!)
- Death moment visual effect (flash vs shake)
- Distance counter formatting and position
- Pause overlay design

</decisions>

<specifics>
## Specific Ideas

- This is a cute educational jump-and-run game about kidney genetics — not a workshop demo
- Game should be visually appealing and eventually provide information about collected genes
- Bold, playful color palette with high contrast — classic platformer energy
- Gene config should include real kidney gene names and descriptions (PKD1, PKD2, COL4A5, NPHS1, NPHS2, WT1)
- Research senior game designer best practices for ground ratio, scrolling feel, and runner pacing

</specifics>

<deferred>
## Deferred Ideas

- Gene educational info display (showing gene descriptions to players) — future phase capability
- Difficulty ramp / speed increase over time — Phase 5
- Visual polish with real sprites and parallax — Phase 6

</deferred>

---

*Phase: 03-game-loop-scrolling*
*Context gathered: 2026-02-18*
