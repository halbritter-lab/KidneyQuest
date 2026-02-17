# KidneyQuest Plan Review

> **Reviewer:** Senior Frontend & Game Development Engineer
> **Date:** 2026-02-17
> **Documents Reviewed:** `.planning/PLAN.md`, `.planning/development-plan.md`, `.planning/ideat.txt`

---

## Overall Scores

| Criteria | Score | Summary |
|----------|:-----:|---------|
| **Modern Stack** | 6/10 | Intentionally constrained but misses a free modernization win (ES Modules) |
| **Best Practices (DRY, KISS, SOLID, Modularization)** | 7/10 | Strong KISS and modularity; some DRY/SOLID gaps |
| **Overall Idea & Concept** | 9/10 | Excellent educational vehicle with clear purpose and scope |
| **Composite** | **7.3/10** | A well-thought-out plan with a few addressable blind spots |

---

## 1. Modern Stack (6/10)

### What Works

- **HTML5 Canvas API** is the correct choice for a 2D side-scrolling game without framework overhead. It remains the [standard approach for 2D browser games](https://www.sitepoint.com/the-complete-guide-to-building-html5-games-with-canvas-and-svg/) in 2026.
- **`requestAnimationFrame` with delta-time normalization** is exactly right. The plan cites [MDN's game anatomy guide](https://developer.mozilla.org/en-US/docs/Games/Anatomy) and [Spicy Yoghurt's game loop tutorial](https://spicyyoghurt.com/tutorials/html5-javascript-game-development/create-a-proper-game-loop-with-requestanimationframe) — both solid references.
- **Zero-dependency, no-build-tool constraint** is a deliberate and justified choice for the workshop audience. This is a feature, not a bug.
- **GitHub Pages** for hosting is an excellent zero-config fit.

### What's Missing or Outdated

#### **Script tags with manual ordering instead of ES Modules** (biggest issue)

The plan explicitly chooses `<script>` tag loading with a `window.KQ` namespace pattern:

```html
<script src="js/config.js"></script>
<script src="js/input.js"></script>
<!-- ... 8 more in specific order ... -->
```

This is the **single most outdated decision** in the plan. Native ES Modules (`<script type="module">`) are [supported in all modern browsers since 2018](https://caniuse.com/es6-module) and require **zero build tools** — fully compatible with the project's constraints.

**Why this matters:**
- Script tag ordering is fragile and error-prone — a workshop participant adding a new file must know the dependency graph
- The `window.KQ` namespace is a pre-2015 pattern that pollutes global scope with extra boilerplate
- ES Modules provide real scoping, explicit dependency declarations via `import`/`export`, and automatic deferred loading
- [Import Maps](https://siddsr0015.medium.com/javascript-modules-in-2025-esm-import-maps-best-practices-7b6996fa8ea3) can further simplify this without any bundler

**Recommended change:**
```html
<!-- index.html -->
<script type="module" src="js/main.js"></script>
```
```javascript
// js/player.js
import { GRAVITY, GROUND_Y, JUMP_VELOCITY } from './config.js';

export class Player { /* ... */ }
```

This is simpler, more modern, eliminates the dependency-ordering problem, and is actually *easier* for beginners since each file declares what it needs. Going [buildless with ES Modules](https://modern-web.dev/guides/going-buildless/es-modules/) is [the recommended modern approach](https://gomakethings.com/scoping-with-vanilla-js-es-modules/).

#### **No mention of `<meta>` viewport or PWA considerations**

For a game that explicitly targets mobile (Phase 4), the plan should at least mention:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
```
This is critical for touch controls to work correctly on mobile.

#### **No mention of `OffscreenCanvas` or `willReadFrequently`**

For canvas performance in 2025/2026, [`willReadFrequently`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/getContext) and potential `OffscreenCanvas` usage for background layer caching are [recommended optimizations](https://gist.github.com/jaredwilli/5469626). Admittedly, this may be premature for the project scope.

---

## 2. Best Practices (7/10)

### KISS (Keep It Simple, Stupid) — 9/10

This is where the plan truly excels. The entire philosophy is KISS:

- Three-state state machine (READY, RUNNING, GAME_OVER) — no over-engineering
- Simple AABB collision detection — exactly right for the genre
- Arcade physics with gravity + jump impulse — no rigid body simulation
- Config-driven tuning via a single `config.js`
- "Test by playing" — honest about the scope not needing a test framework

The development-plan.md adds sensible stretch goals (pixel-perfect collision, procedural patterns) but correctly defers them. This is excellent restraint.

### DRY (Don't Repeat Yourself) — 6/10

**Strengths:**
- Centralized `config.js` for all magic numbers — good DRY application
- Single collision detection function reused for both obstacles and collectibles

**Concerns:**
- **Two overlapping plan documents exist** (`PLAN.md` and `development-plan.md`) that duplicate and sometimes contradict each other:
  - `PLAN.md` uses a `css/style.css` path; `development-plan.md` uses `styles/main.css`
  - `PLAN.md` has 5 phases (timeline in "days"); `development-plan.md` has 4 phases (timeline in "weeks")
  - Physics constants differ: `PLAN.md` uses delta-time-based physics; `development-plan.md` uses frame-based constants (`GRAVITY = 0.6` pixels/frame^2)
  - `PLAN.md` includes `main.js` and `config.js`; `development-plan.md` adds `physics.js` and `ui.js` but lacks `main.js` and `config.js`
  - **Recommendation:** Consolidate into a single source of truth. The delta-time approach in `PLAN.md` is correct; the frame-based approach in `development-plan.md` will break on high-refresh-rate displays.

- **Obstacle and collectible spawning logic will likely be duplicated.** Both involve: spawn at interval, move left, recycle when off-screen. Consider a shared `ScrollingEntity` base class or a generic spawn-manager utility to avoid implementing the same pool/recycle logic twice.

### SOLID Principles — 6/10

**Single Responsibility Principle (SRP) — Good:**
The file structure demonstrates strong SRP. Each file has one clear concern: `player.js` handles the player, `collision.js` handles collision, `score.js` handles scoring. This aligns with [game development SRP best practices](https://www.numberanalytics.com/blog/solid-principles-game-programming).

**Open/Closed Principle (OCP) — Weak:**
The plan doesn't address extensibility patterns. For a workshop where participants will add new obstacle types, new collectible types, and new background layers, the architecture should be open for extension:
- How does a participant add a new obstacle type? Is there a factory, a registry, or do they modify the spawner directly?
- The plan mentions "different obstacle types" and "different gene types" but provides no pattern for how these are registered or managed.
- **Recommendation:** A simple data-driven approach (obstacle types defined in `config.js` as an array of objects with properties) would make OCP trivial and beginner-friendly.

**Liskov Substitution / Interface Segregation — N/A:**
Not meaningfully applicable in a vanilla JS project of this scope. No inheritance hierarchies are planned.

**Dependency Inversion Principle (DIP) — Weak:**
With the `window.KQ` namespace approach, everything depends on everything through the global scope. ES Modules would solve this naturally by making dependencies explicit. The current plan has `game.js` implicitly depending on every other file being loaded first — this is an inverted dependency arrow.

### Modularization — 8/10

**Strengths:**
- File-per-concern structure is clean and navigable
- Target file sizes of 50-150 lines are appropriate and realistic
- Workshop participants can work in isolation on individual files (e.g., modify `obstacle.js` without touching `player.js`)
- The `config.js` centralizing all constants is an excellent decision for both modularity and workshop usability

**Concerns:**
- `game.js` is the orchestrator and will inevitably become a God Object if not carefully managed. It handles: state machine, game loop, update orchestration, render orchestration, and difficulty ramping. Consider splitting into `game.js` (state machine + orchestration) and `renderer.js` (draw order + canvas operations) at minimum.
- No clear pattern for how new entity types register themselves with the game loop. This will matter when workshop participants add features.

---

## 3. Overall Idea & Concept (9/10)

### Exceptional

- **Dual-purpose design** (educational game + workshop vehicle) is brilliant. The game is fun enough to engage participants, simple enough to contribute to, and themed enough to be meaningful to the CeRKiD organization.
- **Workshop issue catalog** (Section 7 of `PLAN.md`) is outstandingly well-designed:
  - Issues are graded by difficulty with clear scope
  - Each issue lists which files are touched — reduces fear of breaking things
  - Beginner issues are truly beginner (change a config value, add text to a screen)
  - Advanced issues are genuinely challenging (particles, audio, sprite animation)
- **The Chrome Dino game analogy** perfectly sets expectations for scope and complexity.
- **"Zebras, not horses"** (rare disease metaphor) gives the project genuine meaning beyond a coding exercise.
- **Git workflow integration** (fork -> clone -> branch -> PR) as a first-class design goal is excellent pedagogy.

### Minor Concerns

- **No mention of accessibility in the game design itself** beyond Phase 4's brief UX section. Consider adding: reduced-motion support (`prefers-reduced-motion` media query), colorblind-safe palette choices, and keyboard-focusable UI elements. The `development-plan.md` does better here with screen reader and high-contrast mentions.
- **No error handling strategy.** What happens when an asset fails to load? What if `localStorage` is full or blocked? The `development-plan.md` mentions these edge cases but `PLAN.md` does not.
- **No versioning or tagging strategy.** For a workshop, it would be helpful to have a tagged "starting point" commit that participants fork from, ensuring everyone starts with the same baseline.

---

## 4. Detailed Findings

### 4.1 Architecture Strengths

| Aspect | Assessment |
|--------|------------|
| Game loop with delta-time | Correct; well-referenced |
| State machine (3 states) | Perfectly scoped for the genre |
| AABB collision with forgiving hitboxes | Industry-standard for runners; good game feel decision |
| Config-driven constants | Excellent for workshop + game tuning |
| Parallax background approach | Well-designed; code samples are clear |
| Asset preloading | Promise-based approach is clean |
| Responsive canvas scaling | Math.min approach is the right pattern |

### 4.2 Architecture Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| `game.js` becoming a God Object | Medium | Split orchestration from rendering early |
| Script ordering breakage | Medium | Switch to ES Modules |
| Frame-dependent physics (in `development-plan.md`) | High | Use only the delta-time approach from `PLAN.md` |
| Two contradicting plan documents | High | Consolidate immediately; one source of truth |
| No extensibility pattern for new entity types | Medium | Add data-driven type definitions in `config.js` |
| No error boundary for asset loading | Low | Add fallback rectangles if images fail |

### 4.3 Code Quality Observations

**Positive:**
- Code samples in the plan are clean and idiomatic
- Naming conventions are clearly defined and consistent
- Comment philosophy ("why not what") is mature
- The `BackgroundLayer` class example demonstrates good encapsulation

**Negative:**
- The `window.KQ = window.KQ || {};` pattern adds boilerplate to every file and is unnecessary with ES Modules
- Physics constants in `development-plan.md` are frame-based (`GRAVITY = 0.6` pixels/frame^2) which will break on 120Hz+ displays. `PLAN.md` correctly uses delta-time. This contradiction must be resolved.
- No mention of `'use strict'` — though this is auto-enabled in ES Modules, another reason to adopt them

---

## 5. Recommendations (Priority-Ordered)

### Must Do (Before Implementation)

1. **Consolidate the two plan documents into one.** The contradictions between `PLAN.md` and `development-plan.md` (directory structure, physics model, phase count, timeline) will cause confusion. Keep `PLAN.md` as the canonical document; it's more detailed and technically correct.

2. **Switch from `<script>` tags to ES Modules.** This is a free modernization win that requires zero build tools, improves code quality, eliminates the ordering problem, and teaches workshop participants a more current pattern. All target browsers support it.

3. **Standardize on delta-time physics only.** Remove all frame-based constants. Every velocity and acceleration value must be multiplied by `deltaTime`.

### Should Do (During Implementation)

4. **Add a data-driven entity registry** in `config.js` for obstacle/collectible types. This makes adding new types (a common workshop task) follow OCP without requiring architectural knowledge.

5. **Plan for `game.js` decomposition.** At minimum, separate rendering concerns into a `renderer.js` to keep `game.js` from becoming monolithic.

6. **Add `<meta name="viewport">` to the HTML template.** Required for mobile touch controls to work correctly.

### Nice to Have

7. **Add `prefers-reduced-motion` checks** before implementing screen shake and particle effects.

8. **Define a tagging strategy** (`v1.0-workshop-start`) for the stable fork point.

9. **Add a simple error fallback** for failed asset loads (colored rectangles) so the game remains playable during development.

---

## 6. Verdict

This is a **well-conceived plan** for its stated purpose. The educational game concept is inspired, the workshop issue catalog is production-quality, and the technical decisions are largely sound for the constraints.

The main gap is a **missed modernization opportunity** with ES Modules — a change that would make the codebase both more modern *and* simpler, which is rare. The secondary gap is the **existence of two conflicting plan documents** that must be reconciled before a single line of code is written.

With the recommended changes applied, this plan would score an **8.5/10** overall.

---

## Sources

- [MDN: Anatomy of a Video Game](https://developer.mozilla.org/en-US/docs/Games/Anatomy)
- [MDN: JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [JavaScript Modules in 2025: ESM, Import Maps & Best Practices](https://siddsr0015.medium.com/javascript-modules-in-2025-esm-import-maps-best-practices-7b6996fa8ea3)
- [Going Buildless: ES Modules (Modern Web)](https://modern-web.dev/guides/going-buildless/es-modules/)
- [Scoping with Vanilla JS ES Modules (Go Make Things)](https://gomakethings.com/scoping-with-vanilla-js-es-modules/)
- [Can I Use: JavaScript modules via script tag](https://caniuse.com/es6-module)
- [Complete Guide to Building HTML5 Games with Canvas and SVG (SitePoint)](https://www.sitepoint.com/the-complete-guide-to-building-html5-games-with-canvas-and-svg/)
- [HTML5 Canvas Performance and Optimization Tips (GitHub Gist)](https://gist.github.com/jaredwilli/5469626)
- [JavaScript Game Development: Core Techniques for 2025 (Playgama)](https://playgama.com/blog/general/javascript-game-development-core-techniques-for-browser-based-games/)
- [SOLID Principles in Game Development (Number Analytics)](https://www.numberanalytics.com/blog/solid-principles-game-programming)
- [SOLID Principles: Single Responsibility in JavaScript (LogRocket)](https://blog.logrocket.com/solid-principles-single-responsibility-in-javascript-frameworks/)
- [JavaScript Object Pool (Steven Lambert)](https://blog.sklambert.com/javascript-object-pool/)
- [Proper Game Loop with requestAnimationFrame (Spicy Yoghurt)](https://spicyyoghurt.com/tutorials/html5-javascript-game-development/create-a-proper-game-loop-with-requestanimationframe)
- [Essential Tools for HTML5 Game Developers in 2026 (Superpowers)](https://superpowers-html5.com/essential-tools-for-html5-game-developers-in-2026/)
