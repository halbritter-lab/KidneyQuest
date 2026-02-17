# Phase 1: Foundation - Context

**Gathered:** 2026-02-17
**Status:** Ready for planning

<domain>
## Phase Boundary

HTML canvas setup, ES Modules architecture, centralized config, input handling, and responsive scaling. Player opens index.html and sees a centered game canvas with a start prompt. No game mechanics yet — just the blank canvas ready for Phase 2.

</domain>

<decisions>
## Implementation Decisions

### Start screen look & feel
- Deep dark blue-black background (#1a1a2e)
- "KidneyQuest" title text displayed above the start prompt
- "Press Space to Start" prompt with pulsing/blinking animation (classic arcade feel)
- Simple horizontal ground line at the bottom of the canvas, hinting at the runner genre
- No real art or branding yet — that's Phase 6

### Canvas sizing & aspect ratio
- 16:9 aspect ratio (widescreen)
- 1280x720 (720p) base resolution
- Canvas centered on dark page background (game window within the page, not full-bleed)
- Scales to fill the viewport on smaller screens (no letterboxing — may crop edges on very narrow screens)

### Input handling
- Three input methods: Space, ArrowUp, and touch/tap
- Tap zone is the entire canvas (tap anywhere to start/jump)
- Auto-focus canvas on page load so keyboard works immediately without clicking
- Lock down mobile: prevent scroll, zoom, and bounce on the canvas element

### Config structure
- Single flat CONFIG object — all values at top level (e.g., CONFIG.CANVAS_WIDTH, CONFIG.GRAVITY)
- Colors included in config (background, player, ground, text) — easy to theme later
- Mutable at runtime — workshop participants can open console and tweak values live
- Default export from config.js: `export default { ... }`

### Claude's Discretion
- Exact font choices and text sizes
- Pulse animation timing/easing
- Ground line color and thickness
- File/module organization beyond config.js
- How scaling is implemented (CSS vs JS resize)

</decisions>

<specifics>
## Specific Ideas

- Workshop context is key: participants will be live-coding, so code should be readable and the game should work alongside visible code
- Mutable config is intentional — participants should be able to experiment by changing values in the console
- The ground line on the start screen creates visual continuity with the scrolling ground in Phase 3

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-17*
