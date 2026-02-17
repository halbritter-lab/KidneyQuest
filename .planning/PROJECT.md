# KidneyQuest

## What This Is

A browser-based side-scrolling runner game (Chrome dino style) starring the CeRKiD zebra mascot, collecting genes and avoiding obstacles in a kidney-themed world. Built as a teaching tool for the AI-Teachathon workshop at CeRKiD (Center for Rare Kidney Diseases, Charite Berlin), where participants learn the full Git workflow by contributing features.

## Core Value

The game must be playable, fun, and simple enough that workshop participants can understand and modify the code with AI assistance — vanilla JS, zero dependencies, open `index.html` and it runs.

## Current Milestone: v1.0 Playable Game

**Goal:** A fully playable, visually themed side-scrolling runner with real zebra sprite, kidney-themed art, and polished mechanics.

**Target features:**
- Complete game loop with start, play, and game over states
- Zebra character with real sprite and run/jump animations
- Obstacle spawning and collision (kidney stones, blockages)
- Gene collectibles with scoring
- Parallax scrolling background layers
- Delta-time physics for frame-rate independence
- Touch + keyboard input
- Difficulty progression

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Playable game skeleton with all core mechanics
- [ ] Real zebra sprite with animation
- [ ] Kidney-themed art and parallax backgrounds
- [ ] Responsive canvas scaling
- [ ] Start screen with CeRKiD branding

### Out of Scope

- Sound effects / audio — complexity vs. value for v1.0
- localStorage high scores — polish, not core
- Workshop prep (README, CONTRIBUTING, Issues) — separate milestone
- Mobile-specific touch UI overlay — basic tap support only
- Power-ups — post-v1.0 feature

## Context

- CeRKiD = Center for Rare Kidney Diseases at Charite Berlin (Halbritter Lab)
- The zebra is the rare disease mascot ("zebras, not horses")
- Workshop is happening NOW — speed matters
- Participants will fork this repo and contribute features via PRs
- Existing planning docs (PLAN.md, development-plan.md) contain detailed architecture decisions
- PLAN.md is the canonical reference (incorporates review feedback)

## Constraints

- **Tech stack**: Vanilla HTML5 Canvas + JS + CSS only — zero dependencies, zero build tools
- **Modules**: Native ES Modules (`<script type="module">`) — no bundler
- **Hosting**: GitHub Pages — auto-deploys from repo
- **Browser targets**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Physics**: Delta-time based (px/s, px/s²) — must work on 60Hz and 120Hz displays
- **Code style**: Beginner-friendly, well-commented, config-driven

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| ES Modules over script tags | Real scoping, explicit imports, no ordering issues, modern pattern | — Pending |
| Delta-time physics | Frame-rate independence on 120Hz+ displays | — Pending |
| Data-driven entity types | Workshop participants add types via config, not code changes | — Pending |
| Separate renderer from game | Prevents game.js God Object | — Pending |
| Config-driven constants | All tunable values in one file for easy modification | — Pending |

---
*Last updated: 2026-02-17 after milestone v1.0 initialization*
