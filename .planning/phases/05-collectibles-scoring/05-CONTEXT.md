# Phase 5: Collectibles + Scoring - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Players collect floating gene pickups for points, see their score during gameplay, face increasing difficulty over time, and can restart after game over. Gene types (PKD1, COL4A5, NPHS1) have different point values and carry educational kidney disease information. This phase delivers the full gameplay loop from start through game over to restart.

</domain>

<decisions>
## Implementation Decisions

### Gene collectible feel
- Floating animation style: Claude's discretion — research best practices for side-scroller collectible animations and apply senior design judgment
- Each gene type gets a distinct color-coded rectangle (visual distinction even at POC stage)
- Gene name (e.g., "PKD1") rendered as text label on/above the colored rectangle — educational even before Phase 6 sprites
- Risk-reward placement: some genes spawn near obstacles, forcing the player to choose between safe path and bonus points

### Score display & collection feedback
- Live score in top-right corner (classic arcade placement)
- Separate counters: distance traveled and gene count shown independently (e.g., "1250m | Genes: 5")
- Floating point popup on collection: "+50" text floats up from collection point and fades — classic arcade feedback
- Gene name briefly flashes near the gene counter on pickup (e.g., "PKD1!") — educational reinforcement during gameplay

### Difficulty ramp
- Smooth continuous speed increase (player barely notices the creep until it's fast)
- Maximum speed cap — skilled players can survive indefinitely at plateau
- Both speed AND spawn frequency increase with difficulty — less reaction time and more obstacles
- Forgiving start with gradual ramp: easy first 30-60 seconds so workshop participants (casual first-time players) can learn the controls before challenge kicks in

### Game over & restart flow
- Score breakdown on game over screen: distance traveled, genes collected (with names), and total score shown separately
- Gene education on game over: each collected gene shows a short description (1-2 sentences) with disease association, e.g., "PKD1 — Polycystic Kidney Disease: Causes fluid-filled cysts in the kidneys"
- Expandable gene detail: each gene entry can be expanded to show inheritance pattern and links to OMIM and GeneReviews
- High score tracking via localStorage — game over screen shows current run vs best score, motivates replay
- Brief pause (1-2 seconds) before restart is allowed — gives time to read the score and gene info
- Press Space/tap after pause to immediately start a new run

### Claude's Discretion
- Exact floating animation parameters (amplitude, frequency, easing)
- Gene color palette choices
- Point values per gene type
- Speed ramp curve and max speed values
- Spawn rate parameters and minimum gap between obstacles
- Floating text animation duration and style
- Score font and styling
- Exact gene descriptions and educational content (accurate to real kidney genetics)
- Layout of the game over screen breakdown

</decisions>

<specifics>
## Specific Ideas

- Gene data in config.js should include: name, color, point value, disease name, short description, inheritance pattern, OMIM link, GeneReviews link
- The game over screen doubles as an educational moment — players learn about kidney genes they collected during their run
- Workshop context: participants are likely geneticists/nephrologists, so disease info should be clinically accurate but concise
- The expandable gene detail on game over turns quick runs into mini-lessons about kidney disease genetics

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 05-collectibles-scoring*
*Context gathered: 2026-02-18*
