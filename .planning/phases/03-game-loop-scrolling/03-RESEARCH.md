# Phase 3: Game Loop + Scrolling - Research

**Researched:** 2026-02-18
**Domain:** HTML5 Canvas game loop, state machine, scrolling ground, entity data config
**Confidence:** HIGH (core patterns); MEDIUM (ground proportions, visual design recommendations)

## Summary

Phase 3 extends the existing Phase 1/2 foundation (main.js, renderer.js, input.js, config.js) to implement a full state machine (READY → COUNTDOWN → RUNNING → PAUSED → GAME_OVER → READY), a continuously scrolling ground with visible motion markers, and a rich entity data structure in config.js. No new libraries are required — all patterns are implementable with native Canvas API, requestAnimationFrame, and the existing module architecture.

The core technical challenge is threefold: (1) adding the COUNTDOWN and PAUSED states to the existing string state machine without breaking Phase 2's jump mechanics, (2) implementing the two-segment ground tile loop for seamless infinite scroll, and (3) resetting deltaTime correctly when unpausing to prevent large physics jumps. The existing `lastTime` variable approach in main.js already handles this correctly when reset to 0 on pause.

Research confirmed that the Chrome Dino Game uses a HEIGHT of 12px for its ground strip — far thinner than our 120px ground area. For a bold, playful educational game at 720px height with GROUND_Y at 600, the 120px ground area (16.7% of canvas height) is appropriate and matches the "classic platformer energy" decision. The play area above is 600px (83.3%), which gives ample jump arc visibility.

**Primary recommendation:** Implement state machine in main.js using string constants, add a `groundOffset` variable for scrolling, use two-segment tile loop for ground markers, reset `lastTime = 0` on pause entry, and set `lastTime = timestamp` on first frame after resume to skip the paused duration delta.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| HTML5 Canvas 2D API | Native | Rendering all visuals | Already in use, no alternatives for this POC |
| requestAnimationFrame | Native | Game loop timing | Browser-optimized, provides DOMHighResTimeStamp, pauses in background tabs |
| ES Modules | ES2015+ | Code organisation | Already established in this codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | — | — | All Phase 3 features are achievable with existing vanilla setup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| String state machine | Symbol-based or enum | Symbols are more robust but the string approach was a locked Phase 1/2 decision — keep strings |
| Manual ground tile loop | CSS animation or transform | CSS cannot be used for canvas rendering |
| Inline state transitions | Separate state module | Overkill for 5 states; inline in main.js stays readable for workshop context |

**Installation:**
```bash
# No installation needed - all native browser APIs
# Already configured in project
```

## Architecture Patterns

### Recommended Project Structure

Phase 3 modifies existing files only — no new files are strictly required. The optional `entities.js` module is recommended for the entity data definitions if config.js becomes long.

```
js/
├── main.js          # EXTEND: state machine (add COUNTDOWN, PAUSED, GAME_OVER), ground scroll, distance counter
├── renderer.js      # EXTEND: add drawGround (two-tone + markers), drawCountdown, drawPauseOverlay, drawGameOver, drawHUD
├── input.js         # EXTEND: add Escape/P key for pause; add cooldown logic for GAME_OVER
├── config.js        # EXTEND: OBSTACLES array (rich), GENES array (6 genes with educational data); color palette
└── (no new files required for MVP)
```

### Pattern 1: Five-State String State Machine

**What:** Extend the existing READY/RUNNING state machine to include COUNTDOWN, PAUSED, and GAME_OVER.
**When to use:** All game state transitions in main.js.

```javascript
// Source: MDN Anatomy of a Video Game + established codebase pattern
// Valid states: 'READY' | 'COUNTDOWN' | 'RUNNING' | 'PAUSED' | 'GAME_OVER'
let gameState = 'READY';

// COUNTDOWN sub-state — tracks which number to show (3, 2, 1, 'Go!')
let countdownValue = 3;
let countdownTimer = 0; // seconds since last count-step
const COUNTDOWN_STEP = 0.8; // seconds per digit

// PAUSED — store which state to return to
let pausedFromState = 'RUNNING';

// GAME_OVER sub-state — death animation then freeze
let gameOverTimer = 0;
const GAME_OVER_FREEZE_DELAY = 1.0; // seconds before showing "Game Over" text
const GAME_OVER_COOLDOWN = 1.0;     // seconds before Space is accepted again

// State transitions
function startCountdown() {
  countdownValue = 3;
  countdownTimer = 0;
  gameState = 'COUNTDOWN';
}

function triggerGameOver() {
  gameOverTimer = 0;
  gameState = 'GAME_OVER';
}

function togglePause() {
  if (gameState === 'RUNNING') {
    pausedFromState = 'RUNNING';
    gameState = 'PAUSED';
    lastTime = 0; // CRITICAL: reset so resume doesn't create huge delta
  } else if (gameState === 'PAUSED') {
    gameState = pausedFromState;
    lastTime = 0; // CRITICAL: will be reset to timestamp on first frame
  }
}
```

### Pattern 2: Pause-Safe Delta Time Reset

**What:** When unpausing, reset `lastTime` to 0 so the first frame after resume sets it fresh.
**When to use:** Any pause/resume transition.

```javascript
// Source: MDN requestAnimationFrame docs + web developer best practices
// The existing main.js already uses this pattern for lastTime.
// On pause: set lastTime = 0
// On first frame of resume: deltaTime will be huge (timestamp - 0) / 1000
// SOLUTION: cap deltaTime to 0.1s (already done in existing gameLoop)

let lastTime = 0;

function gameLoop(timestamp) {
  // When lastTime is 0 (first frame or after resume), delta is huge but capped
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;
  // ...
}
```

The existing `Math.min(..., 0.1)` cap in main.js already handles the resume case correctly — no change needed to the loop signature. Only resetting `lastTime = 0` on pause entry is required.

### Pattern 3: Two-Segment Ground Tile Loop (Infinite Scroll)

**What:** Two ground segments (each canvas-width wide) leapfrog to create infinite horizontal scroll.
**When to use:** Any scrolling ground element that must appear infinite.

```javascript
// Source: Chrome Dino Game HorizonLine pattern (gist.github.com/marcusstenbeck)
// This is the canonical approach for infinite ground scrolling without texture loading

let groundOffset = 0; // tracks how far the ground has scrolled (px)

function updateGround(deltaTime, speed) {
  groundOffset += speed * deltaTime;
  // groundOffset wraps at CANVAS_WIDTH so second segment always follows first
}

function drawGround(ctx, config) {
  const W = config.CANVAS_WIDTH;
  const gY = config.GROUND_Y;
  const groundH = config.CANVAS_HEIGHT - gY; // 120px in this project

  // Two-tone fill: lighter earth band
  ctx.fillStyle = config.GROUND_EARTH_COLOR || '#2a5298'; // lighter earth below surface
  ctx.fillRect(0, gY, W, groundH);

  // Brighter surface line (top edge)
  ctx.fillStyle = config.GROUND_LINE_COLOR;
  ctx.fillRect(0, gY, W, config.GROUND_LINE_WIDTH);

  // Ground markers: scrolling dashes on the surface
  drawGroundMarkers(ctx, config, groundOffset);
}

function drawGroundMarkers(ctx, config, offset) {
  const W = config.CANVAS_WIDTH;
  const markerY = config.GROUND_Y + 8;  // just below surface line
  const markerH = 4;                    // thin horizontal dash
  const markerW = 20;                   // dash width
  const markerGap = 80;                 // gap between dashes
  const spacing = markerW + markerGap;  // 100px total repeat

  ctx.fillStyle = config.GROUND_MARKER_COLOR || '#3a6bc4';

  // Two-segment approach: tile markers across 2x canvas width, offset by scroll
  const phase = offset % spacing;
  for (let x = -phase; x < W; x += spacing) {
    ctx.fillRect(x, markerY, markerW, markerH);
  }
}
```

### Pattern 4: READY-State Slow Scroll (Hint Motion)

**What:** Ground scrolls at reduced speed on the READY screen to hint at runner gameplay.
**When to use:** READY state only.

```javascript
// Source: User decision in CONTEXT.md
const READY_SCROLL_SPEED = 60; // px/s — roughly 30% of GAME_SPEED, feels slow/idle
const RUNNING_SCROLL_SPEED = CONFIG.GAME_SPEED; // 200 px/s

// In update():
if (gameState === 'READY' || gameState === 'COUNTDOWN') {
  updateGround(deltaTime, READY_SCROLL_SPEED);
} else if (gameState === 'RUNNING') {
  updateGround(deltaTime, RUNNING_SCROLL_SPEED);
}
// PAUSED and GAME_OVER: don't call updateGround (ground freezes)
```

### Pattern 5: Countdown Animation (3-2-1-Go!)

**What:** Time-based countdown using countdownTimer accumulation and font-size pulse.
**When to use:** COUNTDOWN state transition into RUNNING.

```javascript
// Source: Standard canvas text animation pattern + user decision (3-2-1-Go!)
function updateCountdown(deltaTime) {
  countdownTimer += deltaTime;
  if (countdownTimer >= COUNTDOWN_STEP) {
    countdownTimer -= COUNTDOWN_STEP;
    countdownValue--;
    if (countdownValue < 0) {
      // Transition to RUNNING
      gameState = 'RUNNING';
      distance = 0; // reset distance counter
    }
  }
}

function drawCountdown(ctx, config) {
  // Large, bold number in center with size pulse
  // countdownValue: 3 → 2 → 1 → 0 (shows "Go!")
  const label = countdownValue > 0 ? String(countdownValue) : 'Go!';
  const pulse = 1.0 - (countdownTimer / COUNTDOWN_STEP) * 0.3; // shrinks as time passes
  const fontSize = Math.round(120 * pulse);

  drawText(ctx, label, config.CANVAS_WIDTH / 2, config.CANVAS_HEIGHT / 2, {
    font: `bold ${fontSize}px sans-serif`,
    color: countdownValue > 0 ? '#FFD700' : '#00FF88', // gold for numbers, green for Go!
  });
}
```

### Pattern 6: Distance Counter HUD

**What:** Accumulate distance in pixels, display as meters (divide by config scale factor).
**When to use:** RUNNING state only.

```javascript
// Source: Endless runner pattern — obstacles don't move, environment moves
// Distance = cumulative scroll distance while RUNNING
let distance = 0; // px scrolled since run started
const PX_PER_METER = 10; // 10 canvas pixels = 1 in-game meter

function updateDistance(deltaTime) {
  if (gameState === 'RUNNING') {
    distance += CONFIG.GAME_SPEED * deltaTime;
  }
}

function drawHUD(ctx, config) {
  const meters = Math.floor(distance / PX_PER_METER);
  drawText(ctx, `${meters}m`, config.CANVAS_WIDTH - 20, 30, {
    font: 'bold 24px sans-serif',
    color: '#FFFFFF',
    align: 'right',
    baseline: 'top',
  });
}
```

### Pattern 7: Keyboard Extension for Pause + Cooldown

**What:** Add Escape/P to input.js; handle GAME_OVER cooldown in handleAction.
**When to use:** PAUSED and GAME_OVER states.

```javascript
// Source: Established input.js onAction callback pattern
// In input.js — add to keydown handler:
if (e.code === 'Escape' || e.code === 'KeyP') {
  e.preventDefault();
  onPause(); // new second callback
}

// In main.js — separate callbacks for action vs pause:
setupInput(canvas, handleAction, handlePause);

function handleAction() {
  if (gameState === 'READY') {
    startCountdown();
  } else if (gameState === 'RUNNING') {
    // Phase 2 jump — already implemented
  } else if (gameState === 'GAME_OVER') {
    // Only accept input after cooldown
    if (gameOverTimer >= GAME_OVER_COOLDOWN) {
      resetGame();
      gameState = 'READY';
    }
  }
}

function handlePause() {
  if (gameState === 'RUNNING' || gameState === 'PAUSED') {
    togglePause();
  }
}
```

### Pattern 8: Rich Entity Config Structure

**What:** Expand OBSTACLE_TYPES and GENE_TYPES with behavior hints and educational data.
**When to use:** config.js — these are data-driven arrays used by Phase 4+ spawning logic.

```javascript
// Source: User decisions in CONTEXT.md — rich entity definitions with behavior hints

OBSTACLE_TYPES: [
  {
    name: 'kidney-stone',
    width: 30,
    height: 40,
    color: '#C4A35A',
    spawnRate: 1.0,     // relative weight (1.0 = baseline)
    movement: 'static', // 'static' | 'float' | 'bounce'
  },
  {
    name: 'blockage',
    width: 50,
    height: 30,
    color: '#8B4513',
    spawnRate: 0.7,
    movement: 'static',
  },
  {
    name: 'cyst',
    width: 35,
    height: 35,
    color: '#9B59B6',
    spawnRate: 0.5,
    movement: 'float',  // bobs up and down
  },
],

GENE_TYPES: [
  {
    name: 'PKD1',
    geneName: 'Polycystin-1',
    geneDescription: 'Helps kidneys develop properly. Mutations cause cysts to form, leading to polycystic kidney disease.',
    color: '#E74C3C', // bold red
    points: 10,
    spawnRate: 1.0,
    movement: 'float',
  },
  {
    name: 'PKD2',
    geneName: 'Polycystin-2',
    geneDescription: 'Works with PKD1 to keep kidneys healthy. PKD2 mutations cause a milder form of polycystic kidney disease.',
    color: '#E67E22', // bold orange
    points: 10,
    spawnRate: 1.0,
    movement: 'float',
  },
  {
    name: 'COL4A5',
    geneName: 'Collagen IV Alpha-5',
    geneDescription: 'Builds the kidney filter membrane. Mutations cause Alport syndrome, leading to kidney failure and hearing loss.',
    color: '#3498DB', // bold blue
    points: 15,
    spawnRate: 0.8,
    movement: 'float',
  },
  {
    name: 'NPHS1',
    geneName: 'Nephrin',
    geneDescription: 'Forms the slit diaphragm — the kidney\'s finest filter. Mutations cause congenital nephrotic syndrome.',
    color: '#2ECC71', // bold green
    points: 20,
    spawnRate: 0.6,
    movement: 'float',
  },
  {
    name: 'NPHS2',
    geneName: 'Podocin',
    geneDescription: 'Anchors nephrin in the filter membrane. Mutations cause steroid-resistant nephrotic syndrome in children.',
    color: '#F1C40F', // bold yellow
    points: 20,
    spawnRate: 0.6,
    movement: 'float',
  },
  {
    name: 'WT1',
    geneName: 'Wilms Tumor Protein 1',
    geneDescription: 'Controls kidney and gonad development. Mutations cause Wilms tumor (kidney cancer) and nephrotic syndrome.',
    color: '#9B59B6', // bold purple
    points: 25,
    spawnRate: 0.4,
    movement: 'float',
  },
],
```

### Pattern 9: Bold Playful Color Palette

**What:** Updated config color values matching "bold and playful, high contrast, classic platformer energy."
**When to use:** Replace the current dark/muted palette in config.js.

```javascript
// Source: User decision — bold primary colors, high contrast; Claude's discretion on exact values

// Sky / background
BACKGROUND_COLOR: '#1a1a2e',  // deep navy (keep existing — provides contrast base)

// Ground — two-tone
GROUND_COLOR: '#2C5F8A',          // medium blue-grey earth band
GROUND_LINE_COLOR: '#4A90D9',     // bright blue surface line (replaces current muted purple)
GROUND_MARKER_COLOR: '#3A78C2',   // slightly darker dash markers on surface
GROUND_LINE_WIDTH: 4,              // increase from 2px to 4px for better visibility

// UI text
TEXT_COLOR: '#FFFFFF',

// HUD accent
HUD_COLOR: '#FFD700',              // gold for distance counter
```

**Rationale for ground proportions (Claude's Discretion):**
- Canvas: 1280x720, GROUND_Y: 600 (existing, from Phase 1 decision)
- Ground strip: 120px (CANVAS_HEIGHT 720 - GROUND_Y 600) = 16.7% of total height
- Play area: 600px (83.3%) — sufficient for jump arcs with GRAVITY: 1800, JUMP_VELOCITY: -650
- The Chrome Dino Game uses only a 12px ground strip (sprite height); our 120px is intentionally larger to support two-tone visual and marker dashes
- The 600px play area is appropriate for a cute platformer with visible sky and room for floating gene entities (which will spawn in later phases)
- **Recommendation:** Keep GROUND_Y: 600 unchanged. The 120px ground is correct for this game's visual style.

### Anti-Patterns to Avoid

- **Not resetting `lastTime` on pause:** When the game unpauses, `(timestamp - lastTime) / 1000` will equal the entire pause duration, causing massive physics jumps. Always reset `lastTime = 0` when entering PAUSED.
- **Updating ground scroll in all states:** Ground should only scroll in READY (slow) and RUNNING (full speed) — freeze in PAUSED and GAME_OVER.
- **Calling `requestAnimationFrame` unconditionally:** The existing loop runs continuously (correct for READY screen animation). Do not switch to cancelAnimationFrame/restart for pause — just check `gameState` in the loop body.
- **Storing countdown state in renderer:** Countdown progress (value, timer) must live in main.js game state, not be calculated per-frame in renderer. Renderer receives values, does not compute them.
- **Separate arrays for different game versions of entities:** Keep a single `GENE_TYPES` array and a single `OBSTACLE_TYPES` array. Don't create `GENE_TYPES_EASY`, `GENE_TYPES_HARD`, etc. — Phase 5 will filter by `spawnRate`.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Infinite ground scroll | A very long pre-drawn ground image | Two-segment tile loop | Zero memory overhead, works at any speed |
| Countdown timer | `setTimeout` chain for 3-2-1 | Delta-time accumulator in update() | setTimeout fires outside the game loop, can't be paused; delta accumulator respects game state |
| Gene/obstacle type data | Hardcoded values in spawn functions | Config arrays with behavior fields | Enables console tweaking, phase-by-phase extension, and future data-driven spawning |
| Pause frame gap | Storing timestamp on pause and manually subtracting | Reset `lastTime = 0` | The existing deltaTime cap (0.1s) already handles the first-frame reset gracefully |
| Distance display | Pixel-perfect tracking with floating-point | Accumulate raw scroll pixels, format as `Math.floor(dist / scale)m` | Simpler, matches how endless runners conventionally work |

**Key insight:** The two-segment tile loop is the canonical approach used by Chrome Dino, every classic endless runner, and all Phaser tile sprite implementations. It requires zero assets, zero memory, and zero math beyond modulo. Do not reinvent it.

## Common Pitfalls

### Pitfall 1: Large Delta on Pause Resume

**What goes wrong:** After unpausing, entities teleport — ground jumps hundreds of pixels, player appears to fall instantly.
**Why it happens:** `lastTime` still holds the pre-pause timestamp; the first resumed frame computes `delta = (resumeTime - pauseTime) / 1000` which could be 30+ seconds.
**How to avoid:** Set `lastTime = 0` when entering PAUSED state. The existing `Math.min(..., 0.1)` cap then clamps the first resumed frame to 0.1s.
**Warning signs:** Ground skips visibly, player suddenly at ground level after unpausing.

### Pitfall 2: Ground Scroll Not Wrapping

**What goes wrong:** Ground markers disappear off the left edge, gap appears, loop is not seamless.
**Why it happens:** Using `groundOffset` directly as a pixel offset without modulo wrapping.
**How to avoid:** In the marker draw loop, calculate `const phase = offset % spacing` and start from `-phase` so markers always begin before the left edge. The modulo ensures the pattern tiles cleanly.
**Warning signs:** Ground markers visibly jump or gap appears every `spacing` pixels.

### Pitfall 3: Input Accepted During GAME_OVER Freeze

**What goes wrong:** Player accidentally skips the death moment by holding Space.
**Why it happens:** handleAction checks `gameState === 'GAME_OVER'` without checking cooldown timer.
**How to avoid:** Gate GAME_OVER → READY transition behind `gameOverTimer >= GAME_OVER_COOLDOWN` (1 second). The cooldown starts from the moment GAME_OVER is entered.
**Warning signs:** Game restarts immediately on death, no visual feedback seen.

### Pitfall 4: Countdown Runs While Ground Doesn't Scroll (Or Vice Versa)

**What goes wrong:** Either the countdown appears on a static screen (feels odd), or the ground scrolls at full speed before the game starts (feels rushed).
**Why it happens:** COUNTDOWN state not included in the READY-speed scroll branch.
**How to avoid:** During COUNTDOWN, scroll ground at READY speed (slow). Transition to RUNNING speed only when `gameState` becomes `'RUNNING'`.
**Warning signs:** Ground is static during 3-2-1, or full-speed scroll before player can react.

### Pitfall 5: Pause Key Handled in Wrong Place

**What goes wrong:** Escape pauses even during READY or GAME_OVER states, causing confusing behaviour.
**Why it happens:** Pause toggle doesn't check current state.
**How to avoid:** In `handlePause()`, only toggle if `gameState === 'RUNNING' || gameState === 'PAUSED'`. All other states ignore the pause key.
**Warning signs:** Escape key causes visual glitches on READY screen.

### Pitfall 6: Config GENE_TYPES Not Backward Compatible

**What goes wrong:** Existing GENE_TYPES has 3 entries (PKD1, COL4A5, NPHS1); Phase 3 replaces with 6. Any Phase 4 code that uses array index directly breaks.
**Why it happens:** Phase 4 might reference `config.GENE_TYPES[0]` etc. instead of using `name` field.
**How to avoid:** Phase 4 spawning code must select from `GENE_TYPES` by iterating/filtering on `name` or `spawnRate`, never by hardcoded index. Document this contract in the config comments.
**Warning signs:** Wrong gene name appears on collectibles in Phase 4.

### Pitfall 7: GAME_OVER Flash Effect Not Delta-Time Safe

**What goes wrong:** Player flash/shake runs too fast on 120Hz screens.
**Why it happens:** Flash effect toggles visibility every N frames instead of every N milliseconds.
**How to avoid:** Track `gameOverTimer` in seconds (delta-time accumulator). Flash visible every 0.1s: `visible = Math.floor(gameOverTimer / 0.1) % 2 === 0`.
**Warning signs:** Flash appears faster on 120Hz displays, invisible on 30Hz.

## Code Examples

Verified patterns from official sources:

### Delta-Safe Game Loop (Existing Pattern — Confirmed Correct)

```javascript
// Source: MDN requestAnimationFrame docs (developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
// The timestamp is a DOMHighResTimeStamp — milliseconds since time origin, sub-ms precision.
// All rAF callbacks in the same frame receive the same timestamp.

let lastTime = 0;

function gameLoop(timestamp) {
  // Cap delta to 0.1s — handles tab switch and pause resume (when lastTime is reset to 0)
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  clearCanvas(ctx, CONFIG);
  drawGround(ctx, CONFIG);

  if (gameState === 'READY') {
    updateGround(deltaTime, READY_SCROLL_SPEED);
    renderStartScreen(ctx, timestamp);
  } else if (gameState === 'COUNTDOWN') {
    updateGround(deltaTime, READY_SCROLL_SPEED);
    updateCountdown(deltaTime);
    drawCountdown(ctx, CONFIG);
  } else if (gameState === 'RUNNING') {
    updateGround(deltaTime, CONFIG.GAME_SPEED);
    updateDistance(deltaTime);
    updatePlayer(deltaTime); // Phase 2
    drawPlayer(ctx, CONFIG);
    drawHUD(ctx, CONFIG);
  } else if (gameState === 'PAUSED') {
    drawPlayer(ctx, CONFIG); // freeze in position
    drawPauseOverlay(ctx, CONFIG);
  } else if (gameState === 'GAME_OVER') {
    updateGameOver(deltaTime);
    drawGameOverEffect(ctx, CONFIG);
  }

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
```

### Infinite Ground Scroll (Canonical Two-Segment Pattern)

```javascript
// Source: Derived from Chrome Dino HorizonLine pattern (gist.github.com/marcusstenbeck/013ff7aa1d683229a2440acaaff70640)
// Chrome Dino uses two alternating segments with random bump variants — we use dash markers instead

let groundOffset = 0;

function updateGround(deltaTime, speed) {
  groundOffset += speed * deltaTime;
  // No modulo needed on groundOffset itself — the draw function handles tiling
}

function drawGround(ctx, config) {
  const W = config.CANVAS_WIDTH;
  const gY = config.GROUND_Y;         // 600
  const groundH = config.CANVAS_HEIGHT - gY; // 120

  // Earth band (lighter, below surface)
  ctx.fillStyle = config.GROUND_COLOR; // #2C5F8A
  ctx.fillRect(0, gY, W, groundH);

  // Surface edge (bright top line)
  ctx.fillStyle = config.GROUND_LINE_COLOR; // #4A90D9
  ctx.fillRect(0, gY, W, config.GROUND_LINE_WIDTH); // 4px

  // Dash markers scrolling left
  const markerW  = 20;
  const markerH  = 4;
  const spacing  = 100; // 20px dash + 80px gap
  const markerY  = gY + 12; // 12px below surface edge
  const phase    = groundOffset % spacing;

  ctx.fillStyle = config.GROUND_MARKER_COLOR; // #3A78C2
  for (let x = -phase; x < W + spacing; x += spacing) {
    ctx.fillRect(Math.round(x), markerY, markerW, markerH);
  }
}
```

### Pause Pattern (Delta-Safe)

```javascript
// Source: MDN requestAnimationFrame + web developer best practice (multiple sources confirm)
// Key: reset lastTime = 0 when entering pause, the 0.1s cap handles the first frame on resume

function togglePause() {
  if (gameState === 'RUNNING') {
    gameState = 'PAUSED';
    lastTime = 0; // CRITICAL — prevents huge delta on resume
  } else if (gameState === 'PAUSED') {
    gameState = 'RUNNING';
    lastTime = 0; // CRITICAL — first resume frame will have delta capped to 0.1s
  }
}
```

### GAME_OVER Flash Effect (Delta-Time Safe)

```javascript
// Source: Derived from standard delta-time pattern; verified against frame-rate independence principle
// (MDN rAF docs warn: "don't assume 60fps — use timestamps")

let gameOverTimer = 0;
const FLASH_INTERVAL = 0.1; // seconds

function updateGameOver(deltaTime) {
  gameOverTimer += deltaTime;
}

function drawGameOverEffect(ctx, config) {
  // Flash player for first second (while freezing)
  if (gameOverTimer < GAME_OVER_FREEZE_DELAY) {
    const flashVisible = Math.floor(gameOverTimer / FLASH_INTERVAL) % 2 === 0;
    if (flashVisible) drawPlayer(ctx, config);
  } else {
    // After freeze delay: show "Game Over" text (Space available after cooldown)
    drawPlayer(ctx, config); // freeze in place
    drawText(ctx, 'Game Over', config.CANVAS_WIDTH / 2, config.CANVAS_HEIGHT * 0.40, {
      font: 'bold 72px sans-serif',
      color: '#FF4444',
    });
    if (gameOverTimer >= GAME_OVER_COOLDOWN) {
      const pulse = 0.3 + 0.7 * Math.abs(Math.sin(gameOverTimer * 3));
      drawText(ctx, 'Press Space to restart', config.CANVAS_WIDTH / 2, config.CANVAS_HEIGHT * 0.55, {
        font: '28px sans-serif',
        color: '#FFFFFF',
        alpha: pulse,
      });
    }
  }
}
```

### Config Entity Arrays (Full Structure)

```javascript
// Source: User decisions in CONTEXT.md — gene data verified against
// medlineplus.gov/genetics/condition/polycystic-kidney-disease/ and
// ncbi.nlm.nih.gov literature (PKD1/PKD2/COL4A5/NPHS1/NPHS2/WT1)

OBSTACLE_TYPES: [
  { name: 'kidney-stone', width: 30, height: 40, color: '#C4A35A', spawnRate: 1.0, movement: 'static' },
  { name: 'blockage',     width: 50, height: 30, color: '#8B4513', spawnRate: 0.7, movement: 'static' },
  { name: 'cyst',         width: 35, height: 35, color: '#9B59B6', spawnRate: 0.5, movement: 'float'  },
],

GENE_TYPES: [
  {
    name: 'PKD1', geneName: 'Polycystin-1',
    geneDescription: 'Helps kidneys develop properly. Mutations cause cysts, leading to polycystic kidney disease.',
    color: '#E74C3C', points: 10, spawnRate: 1.0, movement: 'float',
  },
  {
    name: 'PKD2', geneName: 'Polycystin-2',
    geneDescription: 'Works with PKD1 to keep kidneys healthy. PKD2 mutations cause a milder polycystic kidney disease.',
    color: '#E67E22', points: 10, spawnRate: 1.0, movement: 'float',
  },
  {
    name: 'COL4A5', geneName: 'Collagen IV Alpha-5',
    geneDescription: 'Builds the kidney filter membrane. Mutations cause Alport syndrome with kidney failure and hearing loss.',
    color: '#3498DB', points: 15, spawnRate: 0.8, movement: 'float',
  },
  {
    name: 'NPHS1', geneName: 'Nephrin',
    geneDescription: 'Forms the kidney\'s finest filter barrier. Mutations cause congenital nephrotic syndrome from birth.',
    color: '#2ECC71', points: 20, spawnRate: 0.6, movement: 'float',
  },
  {
    name: 'NPHS2', geneName: 'Podocin',
    geneDescription: 'Anchors the nephrin filter in place. Mutations cause steroid-resistant nephrotic syndrome in children.',
    color: '#F1C40F', points: 20, spawnRate: 0.6, movement: 'float',
  },
  {
    name: 'WT1', geneName: 'Wilms Tumor Protein 1',
    geneDescription: 'Controls kidney development. Mutations cause Wilms tumor (kidney cancer) and nephrotic syndrome.',
    color: '#9B59B6', points: 25, spawnRate: 0.4, movement: 'float',
  },
],
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setInterval-based game loop | requestAnimationFrame | 2012+ (universal) | Loop syncs with display refresh; auto-pauses in background tabs |
| Frame-count based timing | Delta-time (seconds since last frame) | ~2015 standard | Frame-rate independent physics and animation |
| Stopping rAF loop on pause (cancelAnimationFrame) | Keep loop running, check state in body | Modern practice | Simpler code; no risk of failing to restart; overlay can still animate |
| Global mutable ground array | Two-variable offset counter | Always standard | No arrays, no allocations, minimal state |
| Static entity configs | Rich data-driven arrays with behavior hints | Phase design decision | Phase 4+ spawning is data-driven, no hardcoded values in logic |

**Deprecated/outdated for this project:**
- **cancelAnimationFrame for pause:** Stopping and restarting the rAF loop is fragile. Check `gameState` in the loop body instead — the loop runs at 0 CPU cost when it only draws a static overlay.
- **setTimeout chain for countdown:** Fires outside game loop, cannot be paused or reset cleanly.
- **Legacy class-based files (game.js, player.js, background.js, obstacle.js, collectible.js, score.js):** These use `import { GAME_WIDTH } from config` which doesn't exist. They are incompatible with the Phase 1 architecture. Phase 3 must not reference them.

## Open Questions

Things that couldn't be fully resolved:

1. **Ground thickness with two-tone design**
   - What we know: GROUND_Y is 600, CANVAS_HEIGHT is 720, so ground strip is 120px. This is already implemented and locked from Phase 1. The two-tone design (darker surface + lighter earth) fits within this 120px strip.
   - What's unclear: Exact split between surface line height and earth band height within the 120px is at Claude's discretion. Recommended: 4px surface line, 116px earth band.
   - Recommendation: GROUND_LINE_WIDTH: 4 (up from 2) for visibility; rest is earth band color.

2. **Pause overlay colour / opacity**
   - What we know: Needs to dim the game below and show "Paused" text.
   - What's unclear: Semi-transparent overlay vs. darkened background color.
   - Recommendation: Semi-transparent black overlay (`rgba(0, 0, 0, 0.5)`) with bold "PAUSED" text centered — standard game convention, easily achievable with `ctx.fillStyle = 'rgba(0,0,0,0.5)'`.

3. **Input.js API extension for pause key**
   - What we know: Current `setupInput(canvas, onAction)` signature takes one callback.
   - What's unclear: Whether to add `onPause` as second argument or pass an options object `{ onAction, onPause }`.
   - Recommendation: Add as second argument `setupInput(canvas, onAction, onPause)` — cleaner call site, no breaking change if `onPause` defaults to `() => {}`.

## Sources

### Primary (HIGH confidence)
- MDN Web Docs: [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame) — DOMHighResTimeStamp spec, tab-hidden behaviour, official code pattern
- MDN Web Docs: [Anatomy of a Video Game](https://developer.mozilla.org/en-US/docs/Games/Anatomy) — State management, pause patterns, decoupled update/render architecture
- MDN Web Docs: [Canvas Basic Animations](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations) — rAF patterns, delta time
- MedlinePlus Genetics: [Polycystic Kidney Disease](https://medlineplus.gov/genetics/condition/polycystic-kidney-disease/) — PKD1/PKD2 descriptions (verified gene data)
- Chrome Dino Source (via gist.github.com/marcusstenbeck): HorizonLine two-segment ground scroll pattern, 12px ground strip height

### Secondary (MEDIUM confidence)
- [Aleksandr Hovhannisyan - Performant Game Loops](https://www.aleksandrhovhannisyan.com/blog/javascript-game-loop/) — Frame synchronisation, delta time patterns, input decoupling (WebSearch verified against MDN)
- [SpicyYoghurt - Create a Proper Game Loop](https://spicyyoghurt.com/tutorials/html5-javascript-game-development/create-a-proper-game-loop-with-requestanimationframe) — deltaTime calculation, while-loop trap (WebSearch, content verified)
- [Copyprogramming - Pausing Canvas Games](https://copyprogramming.com/howto/how-to-pause-simple-canvas-game-made-with-js-and-html5) — cancelAnimationFrame vs state check pattern
- AJK Diseases / Bangabandhu Medical Journal — COL4A5, NPHS1, NPHS2, WT1 gene associations (clinical literature, verified gene names and diseases)

### Tertiary (LOW confidence)
- WebSearch results on ground proportion ratios — no authoritative source found; recommendation derived from analysis of existing GROUND_Y: 600 decision and Chrome Dino 12px reference, not from an official spec
- Visual design recommendations (colors, marker spacing) — Claude's discretion based on "bold and playful" user decision; no external authoritative source

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All native Canvas APIs, confirmed in use in Phase 1/2 codebase
- Architecture (state machine): HIGH — String state machine is locked from Phase 1/2; extensions follow established pattern
- Architecture (ground scroll): HIGH — Two-segment tile loop is canonical, confirmed in Chrome Dino source
- Pause delta-time handling: HIGH — MDN rAF docs confirm timestamp behaviour; reset-to-zero pattern is well documented
- Ground proportion recommendation: MEDIUM — Derived from analysis; no single authoritative "correct ratio" source exists
- Visual color recommendations: MEDIUM — Consistent with user decision for "bold and playful"; specific hex values are Claude's discretion
- Gene educational data: HIGH — Verified against MedlinePlus (NIH) and clinical literature

**Research date:** 2026-02-18
**Valid until:** 2027-02-18 (1 year — native browser APIs extremely stable; gene descriptions are stable medical knowledge)

**Critical notes for planner:**
- The legacy class-based files (game.js, player.js, etc.) must NOT be referenced. Phase 3 builds only on main.js, renderer.js, input.js, config.js.
- The existing `Math.min((timestamp - lastTime) / 1000, 0.1)` cap already handles pause resume correctly when `lastTime` is reset to 0.
- Entity arrays in config.js need backward-compatible expansion — existing OBSTACLE_TYPES (2 entries) and GENE_TYPES (3 entries) get replaced with richer versions (3 obstacles, 6 genes).
- GROUND_Y: 600 is a locked Phase 1 decision — do not change. All ground rendering works within this constraint.
- `setupInput` signature change (adding `onPause` callback) is a controlled breaking change — acceptable since Phase 2 code also lives in main.js.
