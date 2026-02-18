# Requirements: KidneyQuest

**Defined:** 2026-02-17
**Core Value:** Playable, fun, and simple enough for workshop participants to understand and modify with AI assistance

## v1 Requirements

Requirements for v1.0 Playable Game milestone. Each maps to roadmap phases.

### Core Mechanics

- [x] **MECH-01**: Game displays centered canvas with dark background on page load
- [x] **MECH-02**: Game shows "Press Space to Start" on READY screen
- [x] **MECH-03**: Player can start game by pressing Space or tapping screen
- [ ] **MECH-04**: Player character runs automatically on scrolling ground
- [x] **MECH-05**: Player can jump with Space/ArrowUp (keyboard) or tap (touch)
- [x] **MECH-06**: Jump uses gravity arc with delta-time physics (works on 60Hz and 120Hz)
- [ ] **MECH-07**: Obstacles spawn at intervals and scroll left toward player
- [ ] **MECH-08**: Hitting an obstacle triggers GAME_OVER state
- [ ] **MECH-09**: Gene collectibles spawn and scroll left with floating motion
- [ ] **MECH-10**: Collecting a gene increases score and gene disappears
- [ ] **MECH-11**: Score displays during gameplay (distance + genes collected)
- [ ] **MECH-12**: Game over screen shows final score
- [ ] **MECH-13**: Player can restart from game over by pressing Space or tapping
- [ ] **MECH-14**: Game speed increases gradually over time (difficulty ramp)
- [ ] **MECH-15**: Multiple obstacle types defined in config (kidney stone, blockage)
- [ ] **MECH-16**: Multiple gene types defined in config (PKD1, COL4A5, NPHS1) with different point values

### Visual Polish

- [ ] **VIZP-01**: Zebra character rendered with sprite sheet (replacing colored rectangle)
- [ ] **VIZP-02**: Zebra has run cycle animation (4-6 frames)
- [ ] **VIZP-03**: Zebra has distinct jump/fall animation states
- [ ] **VIZP-04**: Obstacles rendered with kidney-themed sprites
- [ ] **VIZP-05**: Gene collectibles rendered with themed sprites and glow effect
- [ ] **VIZP-06**: Multi-layer parallax background (sky, mid, ground layers)
- [ ] **VIZP-07**: Start screen displays CeRKiD branding/logo
- [ ] **VIZP-08**: Game over screen shows score breakdown (distance + genes) and best score display

### Infrastructure

- [x] **INFR-01**: Project uses ES Modules architecture (single `<script type="module">`)
- [x] **INFR-02**: All tunable constants centralized in config.js
- [x] **INFR-03**: Canvas scales responsively to fit viewport (fixed resolution, CSS-scaled)
- [ ] **INFR-04**: Collision detection uses AABB with configurable hitbox shrink for forgiving feel
- [ ] **INFR-05**: Entity types (obstacles, genes) are data-driven arrays in config

## v2 Requirements

Deferred to future milestone. Tracked but not in current roadmap.

### Workshop Preparation

- **WKSP-01**: Comprehensive README.md with play/run/contribute/structure sections
- **WKSP-02**: CONTRIBUTING.md with step-by-step Git workflow
- **WKSP-03**: GitHub Issue templates (bug, feature) with difficulty labels
- **WKSP-04**: Pre-made Issues from workshop catalog (beginner/intermediate/advanced)
- **WKSP-05**: Tag v1.0-workshop as stable fork point

### UX & Accessibility

- **UX-01**: Sound effects via Web Audio API with mute toggle
- **UX-02**: High score persistence in localStorage
- **UX-03**: Pause on visibilitychange
- **UX-04**: prefers-reduced-motion check for animations
- **UX-05**: Asset preloader with loading screen

## Out of Scope

| Feature | Reason |
|---------|--------|
| Sound/audio | Complexity vs. value for v1.0, defer to v2 |
| localStorage high scores | Polish feature, not core gameplay |
| Power-ups | Post-v1.0 feature |
| Mobile touch UI overlay | Basic tap = jump is sufficient for v1.0 |
| Real-time multiplayer | Way beyond scope |
| Level system | Endless runner, not level-based |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| MECH-01 | Phase 1 | Complete |
| MECH-02 | Phase 1 | Complete |
| MECH-03 | Phase 1 | Complete |
| MECH-04 | Phase 3 | Pending |
| MECH-05 | Phase 2 | Complete |
| MECH-06 | Phase 2 | Complete |
| MECH-07 | Phase 4 | Pending |
| MECH-08 | Phase 4 | Pending |
| MECH-09 | Phase 5 | Pending |
| MECH-10 | Phase 5 | Pending |
| MECH-11 | Phase 5 | Pending |
| MECH-12 | Phase 4 | Pending |
| MECH-13 | Phase 5 | Pending |
| MECH-14 | Phase 5 | Pending |
| MECH-15 | Phase 4 | Pending |
| MECH-16 | Phase 5 | Pending |
| VIZP-01 | Phase 6 | Pending |
| VIZP-02 | Phase 6 | Pending |
| VIZP-03 | Phase 6 | Pending |
| VIZP-04 | Phase 6 | Pending |
| VIZP-05 | Phase 6 | Pending |
| VIZP-06 | Phase 6 | Pending |
| VIZP-07 | Phase 6 | Pending |
| VIZP-08 | Phase 6 | Pending |
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |
| INFR-04 | Phase 4 | Pending |
| INFR-05 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 29 total
- Mapped to phases: 29
- Unmapped: 0

---
*Requirements defined: 2026-02-17*
*Last updated: 2026-02-18 after Phase 2 completion*
