# KidneyQuest - Development Plan (Revised)

> A browser-based side-scrolling runner game starring the CeRKiD zebra mascot, built as a teaching tool for the AI-Teachathon workshop.

---

## 1. Project Overview

**KidneyQuest** is an endless side-scrolling runner (in the spirit of Chrome's dinosaur game) where the CeRKiD zebra runs through a kidney-themed world, collecting genes and avoiding obstacles. The game serves dual purposes:

1. **Educational outreach** for the Center for Rare Kidney Diseases (CeRKiD) at Charite Berlin
2. **Workshop vehicle** for the AI-Teachathon, where participants learn the full Git workflow (fork, clone, branch, code with AI, commit, push, PR) by contributing features to this game

**Key Constraint:** Vanilla HTML/CSS/JS only. Zero dependencies, zero build tools. Open `index.html` in a browser and it runs. This is non-negotiable — workshop participants must be able to understand and modify the code with AI assistance.

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Rendering | HTML5 Canvas API | Hardware-accelerated 2D rendering, no dependencies |
| Language | Vanilla JavaScript (ES6+) | No transpilation needed, runs in all modern browsers |
| Modules | Native ES Modules (`<script type="module">`) | Real scoping, explicit imports, no bundler needed, [supported in all modern browsers](https://caniuse.com/es6-module) |
| Styling | Vanilla CSS | Minimal — mostly for the page wrapper around the canvas |
| Assets | PNG sprites + simple colored shapes (POC) | Easy to create, modify, and understand |
| Audio | Web Audio API (post-POC) | Built into browsers, no library needed |
| Hosting | GitHub Pages | Free, auto-deploys from repo, perfect for workshops |

---

## 3. Project Structure

```
KidneyQuest/
├── index.html                # Single entry point — open and play
├── css/
│   └── style.css             # Page layout, canvas centering, UI overlays
├── js/
│   ├── main.js               # Entry point (type="module"): canvas setup, game init
│   ├── config.js              # All tunable constants (speeds, sizes, gravity, etc.)
│   ├── game.js                # Game class: state machine, game loop, orchestration
│   ├── player.js              # Zebra character: position, jump physics, animation
│   ├── input.js               # Keyboard + touch input handler
│   ├── collision.js           # AABB collision detection utility
│   ├── background.js          # Parallax scrolling background layers
│   ├── renderer.js            # Canvas draw helpers and render orchestration
│   ├── obstacle.js            # Obstacle spawning, movement, and management
│   ├── collectible.js         # Gene collectibles: spawning, collection logic
│   └── score.js               # Score tracking and display
├── assets/
│   ├── sprites/               # Character and object sprite sheets
│   ├── backgrounds/           # Parallax background layers
│   └── ui/                    # UI elements (logo, buttons, icons)
├── .planning/                 # Planning docs (not part of the game)
├── LICENSE
└── README.md
```

**Why this structure:**
- Each file has a single, clear responsibility (SRP) — workshop participants can find and modify what they need
- `config.js` centralizes all magic numbers — makes it easy for beginners to tweak gameplay
- Small files (~50-150 lines each) are less intimidating than one monolithic script
- ES Modules eliminate script-ordering issues — each file declares its own imports
- `renderer.js` keeps `game.js` from becoming a God Object — game logic stays separate from draw calls

---

## 4. Module Strategy

### Why ES Modules (not `<script>` tags)

Native ES Modules work without any bundler. A single `<script type="module">` in `index.html` is the only script tag needed. Benefits:

- **No manual ordering** — imports declare dependencies explicitly
- **Real scoping** — no global namespace pollution, no `window.KQ` boilerplate
- **Easier for workshop participants** — adding a new file just requires an `import` line, not editing `index.html` in the right order
- **Automatic deferral** — modules load after HTML is parsed

```html
<!-- index.html — the ONLY script tag -->
<script type="module" src="js/main.js"></script>
```

```javascript
// js/player.js — clean imports, no boilerplate
import { GRAVITY, GROUND_Y, JUMP_VELOCITY } from './config.js';

export class Player {
  // ...
}
```

```javascript
// js/main.js — entry point imports everything it needs
import { Game } from './game.js';

const canvas = document.getElementById('game-canvas');
const game = new Game(canvas);
game.start();
```

---

## 5. Core Architecture

### 5.1 Game Loop

`requestAnimationFrame` with delta-time normalization for frame-rate independent physics. All movement values are in **pixels per second**, multiplied by `deltaTime` (in seconds) each frame.

```
┌─────────────────────────────────────────┐
│              Game Loop                  │
│                                         │
│  1. Calculate deltaTime (seconds)       │
│  2. Process input                       │
│  3. Update game state                   │
│     - Move player (apply gravity/jump)  │
│     - Move obstacles & collectibles     │
│     - Scroll backgrounds                │
│     - Check collisions                  │
│     - Update score                      │
│  4. Render frame                        │
│     - Clear canvas                      │
│     - Draw backgrounds (back to front)  │
│     - Draw collectibles                 │
│     - Draw obstacles                    │
│     - Draw player                       │
│     - Draw UI (score, etc.)             │
│  5. requestAnimationFrame(loop)         │
└─────────────────────────────────────────┘
```

### 5.2 Game State Machine

```
  ┌──────────┐    Space/Tap     ┌──────────┐
  │  READY   │ ───────────────> │ RUNNING  │
  │ (title)  │                  │ (playing)│
  └──────────┘                  └────┬─────┘
       ^                             │
       │         ┌──────────┐        │ collision
       └──────── │ GAME_OVER│ <──────┘
     Space/Tap   │ (score)  │
                 └──────────┘
```

Three states: **READY** (title), **RUNNING** (playing), **GAME_OVER** (score display).

### 5.3 Physics Model

All values are in **pixels per second** (velocity) or **pixels per second squared** (acceleration). This is critical — frame-based values (`GRAVITY = 0.6` per frame) break on 120Hz+ displays.

```javascript
// config.js — units are px/s and px/s²
export const GRAVITY = 1800;          // px/s² downward
export const JUMP_VELOCITY = -650;    // px/s upward (negative = up)
export const GROUND_Y = 250;          // px from top
export const GAME_SPEED = 200;        // px/s horizontal scroll
```

```javascript
// player.js — deltaTime makes it frame-rate independent
update(deltaTime) {
  this.velocityY += GRAVITY * deltaTime;
  this.y += this.velocityY * deltaTime;

  if (this.y >= GROUND_Y) {
    this.y = GROUND_Y;
    this.velocityY = 0;
    this.isGrounded = true;
  }
}
```

### 5.4 Collision Detection

Simple AABB with a configurable hitbox shrink factor for forgiving collision:

```javascript
// collision.js
export function checkCollision(a, b, shrink = 0) {
  return (
    a.x + shrink < b.x + b.width - shrink &&
    a.x + a.width - shrink > b.x + shrink &&
    a.y + shrink < b.y + b.height - shrink &&
    a.y + a.height - shrink > b.y + shrink
  );
}
```

### 5.5 Data-Driven Entity Types

Obstacle and collectible types are defined in `config.js` as arrays. This makes adding new types (a common workshop task) a data change rather than a code change:

```javascript
// config.js
export const OBSTACLE_TYPES = [
  { name: 'kidney-stone', width: 30, height: 40, color: '#8B7355' },
  { name: 'blockage',     width: 50, height: 30, color: '#A0522D' },
];

export const GENE_TYPES = [
  { name: 'PKD1',   color: '#4CAF50', points: 10 },
  { name: 'COL4A5', color: '#2196F3', points: 15 },
  { name: 'NPHS1',  color: '#FF9800', points: 20 },
];
```

Workshop participants add a new obstacle by adding one object to the array — no architectural knowledge required.

---

## 6. Implementation Phases

### POC (Proof of Concept) — BUILD THIS FIRST

> **Goal:** A playable rectangle-jumps-over-rectangles game in the browser. No sprites, no assets, just colored shapes and working mechanics.

**Files to generate (in this order):**

| # | File | Purpose | ~Lines |
|---|------|---------|--------|
| 1 | `index.html` | Canvas element, single `<script type="module">`, viewport meta | ~25 |
| 2 | `css/style.css` | Dark background, centered canvas, no scrollbars | ~30 |
| 3 | `js/config.js` | All constants: canvas size, physics, speeds, entity types | ~50 |
| 4 | `js/input.js` | InputHandler class: keyboard (Space/ArrowUp) + basic touch | ~40 |
| 5 | `js/collision.js` | Single `checkCollision()` function with shrink param | ~15 |
| 6 | `js/player.js` | Player class: colored rectangle, gravity, jump, ground snap | ~60 |
| 7 | `js/background.js` | Scrolling ground line + sky gradient (no images) | ~50 |
| 8 | `js/obstacle.js` | ObstacleManager: spawn from config types, move left, recycle | ~70 |
| 9 | `js/collectible.js` | CollectibleManager: spawn genes from config, float, collect | ~70 |
| 10 | `js/score.js` | Score class: distance + genes, draw to canvas | ~40 |
| 11 | `js/renderer.js` | Renderer class: clear, drawRect, drawText, draw order | ~60 |
| 12 | `js/game.js` | Game class: state machine, loop, deltaTime, wire everything | ~120 |
| 13 | `js/main.js` | Entry point: get canvas, create Game, call start() | ~15 |

**POC Deliverable checklist:**
- [ ] Open `index.html` in browser — game canvas appears centered on dark background
- [ ] "Press Space to Start" text shown on READY screen
- [ ] Press Space — game starts, ground scrolls, player rectangle runs
- [ ] Press Space during gameplay — player jumps with gravity arc
- [ ] Colored rectangle obstacles spawn and scroll left
- [ ] Colored rectangle genes spawn and scroll left (floating motion)
- [ ] Hitting obstacle = GAME_OVER screen with score
- [ ] Collecting gene = score increases, gene disappears
- [ ] Score (distance + genes) displayed during gameplay
- [ ] Press Space on GAME_OVER = restart
- [ ] Game speed increases gradually over time
- [ ] Works on 60Hz and 120Hz displays (delta-time physics)
- [ ] Basic touch support (tap = jump) for mobile testing

**What the POC explicitly does NOT include:**
- No sprite sheets or images — all entities are colored rectangles/circles
- No parallax layers — just a scrolling ground line and gradient sky
- No sound
- No localStorage high scores
- No particles or screen shake
- No responsive scaling beyond basic viewport meta

---

### Phase 2: Core Polish

**Goal:** Replace placeholders with real art, add visual depth.

1. Create/source zebra sprite sheet (run cycle: 4-6 frames)
2. Implement sprite animation system in `player.js` (frame cycling by time)
3. Create kidney-themed obstacle sprites
4. Create gene collectible sprites with glow
5. Implement multi-layer parallax in `background.js`:
   - Sky gradient (drawn, no image needed)
   - Mid layer — clouds or distant shapes (slow scroll)
   - Ground layer — textured terrain (fast scroll)
6. Add start screen with CeRKiD branding
7. Add game over screen polish (score breakdown, best score)

### Phase 3: UX & Accessibility

**Goal:** Make it work well everywhere.

1. Responsive canvas scaling (fixed resolution, CSS-scaled)
2. Visual touch target for mobile
3. Pause on `visibilitychange`
4. High score in `localStorage`
5. Sound effects via Web Audio API + mute toggle
6. Asset preloader with loading screen
7. `prefers-reduced-motion` check — skip shake/particles if set

### Phase 4: Workshop Preparation

**Goal:** Contribution-ready repo.

1. Comprehensive `README.md` (play, run, contribute, structure)
2. `CONTRIBUTING.md` with step-by-step Git workflow
3. GitHub Issue templates (bug, feature)
4. Pre-made Issues from the catalog below (labeled by difficulty)
5. Code comments explaining architecture where "why" isn't obvious
6. Tag `v1.0-workshop` as the stable fork point
7. End-to-end test of the fork-to-PR workflow

---

## 7. Workshop Issue Catalog

### Beginner (good-first-issue)

| # | Issue Title | Description | Files |
|---|-------------|-------------|-------|
| 1 | Change the sky gradient color | Modify the background gradient in config | `config.js` |
| 2 | Adjust jump height | Change `JUMP_VELOCITY` to make jumps higher/lower | `config.js` |
| 3 | Add a "Press Space to Start" message | Show instruction text on READY screen | `renderer.js` or `game.js` |
| 4 | Display genes collected count separately | Show a gene counter alongside distance score | `score.js` |
| 5 | Add a new gene type | Add an entry to `GENE_TYPES` in config | `config.js` |

### Intermediate

| # | Issue Title | Description | Files |
|---|-------------|-------------|-------|
| 6 | Add a cloud parallax layer | New background layer with slower scroll speed | `background.js`, `config.js` |
| 7 | Improve jump physics (variable height) | Hold Space longer = jump higher | `player.js`, `input.js` |
| 8 | Add a new obstacle type | Add entry to `OBSTACLE_TYPES` + optional sprite | `config.js`, `obstacle.js` |
| 9 | Add screen shake on collision | Translate canvas briefly on game over trigger | `renderer.js`, `game.js` |
| 10 | Add high score persistence | Save/load best score via localStorage | `score.js` |
| 11 | Add a gene collection scoreboard | Show which specific genes were collected | `collectible.js`, `score.js` |

### Advanced

| # | Issue Title | Description | Files |
|---|-------------|-------------|-------|
| 12 | Add double jump | One extra jump while airborne | `player.js` |
| 13 | Add particle effects on gene collection | Spawn expanding circles on collect | new `particles.js` |
| 14 | Add mobile touch controls with visual indicator | Tap target + touch feedback | `input.js`, `renderer.js` |
| 15 | Add sound effects | Jump, collect, crash via Web Audio API | new `audio.js` |
| 16 | Add animated zebra sprite | Replace rectangle with sprite sheet | `player.js`, assets |
| 17 | Add power-ups | Invincibility, magnet, or 2x points | new `powerup.js`, `config.js` |

---

## 8. Design Guidelines

### Visual Theme
- **Color palette**: Kidney reds/pinks (#E57373, #EF5350), biological greens (#66BB6A), medical blues (#42A5F5), warm whites (#FFF8E1)
- **Style**: Friendly, approachable, slightly cartoonish — not clinical
- **POC colors**: Player = zebra stripes (black/white rect), obstacles = brown, genes = colored circles with labels

### Game Feel Targets
- **Scroll speed**: Start ~200 px/s, ramp 5 px/s per second, cap at ~500 px/s
- **Jump**: Responsive and snappy — immediate upward velocity, no wind-up
- **Collision**: Hitbox shrunk ~4px per side from visual rect — near misses feel good
- **Session length**: 30-60 seconds beginner, 2-3 minutes skilled

---

## 9. Development Principles

1. **Simplicity over elegance** — understandable by a beginner with AI assistance
2. **No premature abstraction** — don't build systems we don't need yet
3. **Config-driven** — all tunable values in `config.js`, not buried in logic
4. **Data-driven entities** — new types are config entries, not new code paths
5. **Delta-time everywhere** — all movement in px/s, multiplied by deltaTime
6. **Progressive enhancement** — colored rectangles first, sprites later
7. **Small, focused commits** — each commit does one thing
8. **Comments where "why" isn't obvious** — don't explain what, explain why

---

## 10. Technical Decisions

### 10.1 Responsive Canvas

Fixed game resolution, CSS-scaled to fill viewport:

```javascript
// In main.js or renderer.js
function resizeCanvas(canvas) {
  const scale = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT
  );
  canvas.style.width = (GAME_WIDTH * scale) + 'px';
  canvas.style.height = (GAME_HEIGHT * scale) + 'px';
}
```

### 10.2 Asset Loading (Post-POC)

Promise-based preloader. During POC, all entities are drawn as colored shapes — no images to load.

```javascript
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null); // Fallback: null means "draw rectangle"
    img.src = src;
  });
}
```

Note: `onerror` resolves with `null` instead of rejecting — game stays playable with colored fallback rectangles if any asset fails.

### 10.3 Sprite Animation (Post-POC)

Horizontal strip sprite sheets, frame advanced by elapsed time:

```javascript
drawFrame(ctx, x, y) {
  ctx.drawImage(
    this.spriteSheet,
    this.frameIndex * this.frameWidth, 0,
    this.frameWidth, this.frameHeight,
    x, y,
    this.frameWidth, this.frameHeight
  );
}
```

---

## 11. Milestones & Priority

| Priority | Milestone | Scope |
|----------|-----------|-------|
| **P0** | **POC: Playable skeleton** | Files 1-13 above, colored rectangles, all core mechanics |
| P1 | Phase 2: Art & sprites | Replace shapes with real art, parallax |
| P1 | Phase 4: Workshop prep | README, CONTRIBUTING, Issues, tag |
| P2 | Phase 3: UX & mobile | Responsive, sound, localStorage, accessibility |

**POC is the only blocker.** Everything else builds on it incrementally.

---

## 12. POC Build Order (Step-by-Step)

This is the exact sequence to follow when implementing:

```
Step 1: index.html + css/style.css
        → Browser shows centered dark canvas
        → Commit: "Add HTML canvas and base styles"

Step 2: js/config.js + js/main.js (empty game shell)
        → Console log confirms module loading works
        → Commit: "Add config constants and module entry point"

Step 3: js/input.js
        → Key/touch events logged to console
        → Commit: "Add keyboard and touch input handler"

Step 4: js/player.js + js/collision.js
        → Rectangle drawn on canvas, responds to jump input
        → Commit: "Add player with jump physics and collision util"

Step 5: js/background.js
        → Ground line scrolls, sky gradient renders
        → Commit: "Add scrolling ground and sky background"

Step 6: js/renderer.js + js/game.js (game loop + state machine)
        → Full loop runs: READY → RUNNING → GAME_OVER
        → Player runs and jumps on scrolling ground
        → Commit: "Add game loop, state machine, and renderer"

Step 7: js/obstacle.js
        → Obstacles spawn, scroll, and kill player on collision
        → Commit: "Add obstacle spawning and collision"

Step 8: js/collectible.js + js/score.js
        → Genes spawn, can be collected, score displays
        → Commit: "Add gene collectibles and scoring"

Step 9: Difficulty ramp + game over screen + restart
        → Speed increases over time, final score shown, restart works
        → Commit: "Add difficulty progression and game over flow"
```

**After Step 9, the POC is complete.** Every subsequent phase is additive polish.

---

## 13. References

- [MDN: Anatomy of a Video Game](https://developer.mozilla.org/en-US/docs/Games/Anatomy)
- [MDN: JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [MDN: Collision Detection](https://developer.mozilla.org/en-US/docs/Games/Tutorials/2D_Breakout_game_pure_JavaScript/Collision_detection)
- [Spicy Yoghurt: Proper Game Loop](https://spicyyoghurt.com/tutorials/html5-javascript-game-development/create-a-proper-game-loop-with-requestanimationframe)
- [Performant Game Loops (Delta Time)](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/)
- [Can I Use: ES Modules](https://caniuse.com/es6-module)
- [Going Buildless with ES Modules](https://modern-web.dev/guides/going-buildless/es-modules/)
- [William Malone: Sprite Animation](http://www.williammalone.com/articles/create-html5-canvas-javascript-sprite-animation/)
- [Responsive HTML5 Canvas](https://blog.sklambert.com/responsive-html5-canvas-game/)
- [MDN: Mobile Touch Controls](https://developer.mozilla.org/en-US/docs/Games/Techniques/Control_mechanisms/Mobile_touch)
