# Phase 6: Visual Polish - Research

**Researched:** 2026-02-18
**Domain:** HTML5 Canvas 2D sprite sheet rendering, parallax backgrounds, particle systems, screen shake, pixel art techniques
**Confidence:** HIGH (Canvas 2D APIs verified via MDN official docs); MEDIUM (art generation workflow, pixel font patterns)

## Summary

Phase 6 replaces the procedural placeholder art (colored rectangles + procedural chibi zebra) with sprite-based rendering, a multi-layer parallax background, collection/death effects, and polished game screens. The mechanics from Phases 1-5 are fully built; this phase is a pure visual layer swap. No new gameplay logic, no external libraries.

The existing codebase already has significant visual infrastructure: `drawPlayer` in `renderer.js` has the try-catch sprite fallback pattern, `ANIM_STATES` in `player.js` already defines the full animation state machine (idle 4f, run 6f, jump 2f, fall 2f, land 3f, doubleJump 2f), and the game loop in `main.js` passes `animState`/`animFrame` correctly. The Canvas 2D `drawImage` 9-parameter sprite sheet API is the primary technical mechanism needed. Background rendering currently uses `createLinearGradient` — the same API extended with 5 layers at different scroll speeds implements parallax. Particle effects are pure procedural Canvas 2D (no library needed).

The critical architectural constraint: everything must remain zero-dependency vanilla JavaScript. The existing module architecture (`js/player.js`, `js/renderer.js`, `js/background.js`, `js/obstacle.js`, `js/collectible.js`, `js/main.js`) is extended, not replaced. The background.js currently uses a Class pattern (unlike other modules which use factory functions) — this inconsistency exists but is acceptable to continue for this phase.

**Primary recommendation:** Implement in order: (1) sprite sheet loader module with decode() fallback, (2) parallax background rewrite, (3) drawPlayer swap to sprite-based, (4) obstacle/collectible sprites, (5) particle effects, (6) screen shake, (7) screen UI polish. This order lets each piece be verified before the next depends on it.

## Standard Stack

This phase uses zero external libraries. All implementation is vanilla JavaScript on the Canvas 2D API.

### Core

| API | Source | Purpose | Why Standard |
|-----|--------|---------|--------------|
| `ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh)` | Browser native (MDN verified) | Sprite sheet frame rendering | 9-param form clips exact frame from sheet |
| `new Image()` + `img.decode()` | Browser native (MDN verified, supported since Jan 2020) | Async image preloading | Returns Promise; cleaner than onload, handles errors |
| `ctx.imageSmoothingEnabled = false` | Browser native (MDN verified, supported since Apr 2017) | Crisp pixel art rendering | Prevents bilinear blur when scaling pixel sprites |
| `ctx.createLinearGradient()` | Browser native (MDN verified) | Procedural sky/background gradients | Already in use; zero image files, infinitely seamless |
| `ctx.save()` / `ctx.translate()` / `ctx.restore()` | Browser native | Screen shake camera offset | Isolates shake transform from entity rendering |
| `ctx.shadowBlur` / `ctx.shadowColor` | Browser native (MDN verified, supported since July 2015) | Gene glow effect | Single-property glow; must be set before drawing |
| `ctx.createPattern(img, 'repeat')` | Browser native (MDN verified) | Tileable mid-layer parallax strips | Seamless repeat with translate offset for scroll |

### Supporting

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| PixelLab | Web/API | AI pixel art sprite generation (primary) | Generating zebra sprite sheet, obstacle/collectible sprites |
| Aseprite | Desktop | Sprite sheet editing and frame layout | Post-generation cleanup, exact frame boundary control |
| Gemini / Nano Banana | Latest | Supplementary AI sprite generation | If PixelLab output is unsuitable |
| Claude SVG output | N/A | Reference/mood board images | Establishing visual target before PixelLab prompts |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `img.decode()` | `img.onload` callback | `decode()` returns Promise so works with async/await; cleaner error handling; both are correct, but decode() is more modern |
| `ctx.shadowBlur` for glow | Sprite-based glow frames | shadowBlur is simpler (no extra art assets) but has performance cost; sprite-based glow is zero runtime cost but requires more art frames — use shadowBlur as it's Claude's discretion |
| Procedural Canvas particles | Canvas-Sprite-Animations library | Library adds dependency; particles are simple enough (circle arcs with fade) to stay procedural |
| Horizontal sprite strip | Grid sprite sheet | Horizontal strip is simpler to calculate frame offsets (`frameIndex * frameWidth`); grid requires row/column math — use horizontal strip |

**Installation:**
```bash
# No installation needed - all native browser APIs
# No npm packages required
```

## Architecture Patterns

### Recommended Project Structure

Phase 6 adds new files and significantly modifies two existing ones:

```
js/
├── main.js              # EXTEND: wire shake state, gene collection flash, particle update/draw
├── renderer.js          # EXTEND: add drawPlayerSprite, drawObstacleSprite, drawGeneSprite,
│                        #         drawParticles, applyScreenShake, polished drawGameOver/drawStartScreen
├── background.js        # REWRITE: 5-layer parallax system replacing simple gradient
├── obstacle.js          # EXTEND: sprite draw path with procedural fallback
├── collectible.js       # EXTEND: sprite draw path, glow effect, bob animation
├── sprites.js           # NEW: image loader module, sprite sheet frame calculator
└── particles.js         # NEW: particle pool factory for collection and death effects
assets/
├── sprites/
│   ├── zebra-sheet.png  # Horizontal strip: ~20 frames @ 64px each = ~1280x80px image
│   ├── obstacles.png    # Kidney stone, blockage, cyst sprites (3 types x ~2 frames)
│   ├── genes.png        # PKD1, PKD2, COL4A5, NPHS1, NPHS2, WT1 sprites (6 types x ~2 frames)
│   └── bg-mid.png       # Tileable organic tube wall strip (~200x60px)
```

### Pattern 1: Sprite Sheet Loader Module

**What:** A `sprites.js` module that loads all PNG assets asynchronously and exposes them as ready Image objects. The game waits for assets before starting the loop, or starts with placeholders and swaps in sprites when ready.

**When to use:** Any time a PNG file must be drawn with `ctx.drawImage`

**Recommended approach:** Load all images upfront, resolve when all are ready, start game loop after. This prevents a frame where sprites are partially loaded.

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode
// sprites.js

const SPRITE_PATHS = {
  zebra:     'assets/sprites/zebra-sheet.png',
  obstacles: 'assets/sprites/obstacles.png',
  genes:     'assets/sprites/genes.png',
  bgMid:     'assets/sprites/bg-mid.png',
};

// Resolved sprites object — null until loadSprites() completes
export const SPRITES = {
  zebra:     null,
  obstacles: null,
  genes:     null,
  bgMid:     null,
};

/**
 * Loads all sprites concurrently. Returns a Promise that resolves when
 * all images are decoded and ready to draw, or rejects on any load failure.
 * Callers should handle rejection by falling back to procedural rendering.
 */
export async function loadSprites() {
  const entries = Object.entries(SPRITE_PATHS);
  await Promise.all(entries.map(async ([key, path]) => {
    const img = new Image();
    img.src = path;
    try {
      await img.decode();   // throws EncodingError if load fails
      SPRITES[key] = img;
    } catch (e) {
      console.warn(`[sprites] Failed to load ${path} — using procedural fallback`);
      // SPRITES[key] remains null; callers check null before drawImage
    }
  }));
}
```

### Pattern 2: Sprite Sheet Frame Drawing

**What:** A helper that maps `(animState, animFrame)` to the correct `(sx, sy)` in the sprite sheet, then calls `ctx.drawImage`.

**When to use:** `drawPlayer`, `drawObstacle`, `drawGene` in `renderer.js`

**Sprite sheet layout (horizontal strip, all frames in one row):**
```
zebra-sheet.png (horizontal strip, frame width = 64px, frame height = 80px):
[idle-0][idle-1][idle-2][idle-3][run-0][run-1][run-2][run-3][run-4][run-5]
[jump-0][jump-1][fall-0][fall-1][land-0][land-1][land-2]
[doubleJump-0][doubleJump-1][death-0][death-1][death-2][death-3]

Total ~20 frames: 64px * 20 = 1280px wide, 80px tall
```

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
// In renderer.js

// Frame index lookup table — maps animState to starting frame in the horizontal strip
const ZEBRA_FRAME_START = {
  idle:       0,   // frames 0-3
  run:        4,   // frames 4-9
  jump:       10,  // frames 10-11
  fall:       12,  // frames 12-13
  land:       14,  // frames 14-16
  doubleJump: 17,  // frames 17-18
  death:      19,  // frames 19-22
};

const FRAME_WIDTH  = 64;
const FRAME_HEIGHT = 80;

/**
 * Draws one frame of the zebra sprite sheet.
 * Falls back to procedural drawZebraFrame if SPRITES.zebra is null.
 */
export function drawPlayerSprite(ctx, player, config) {
  ctx.save();

  // Squash/stretch anchored at bottom-centre (same as existing drawPlayer)
  ctx.translate(player.x + config.PLAYER_WIDTH / 2, player.y + config.PLAYER_HEIGHT);
  ctx.scale(player.squashX, player.squashY);
  ctx.translate(-(config.PLAYER_WIDTH / 2), -config.PLAYER_HEIGHT);

  if (SPRITES.zebra) {
    // Disable smoothing for crisp pixel art
    // Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
    ctx.imageSmoothingEnabled = false;

    const stateStart = ZEBRA_FRAME_START[player.animState] ?? 0;
    const frameIndex = stateStart + (player.animFrame ?? 0);
    const sx = frameIndex * FRAME_WIDTH;

    ctx.drawImage(
      SPRITES.zebra,
      sx,           // source x
      0,            // source y (single row sheet)
      FRAME_WIDTH,  // source width
      FRAME_HEIGHT, // source height
      0,            // dest x (relative to translated origin)
      0,            // dest y
      config.PLAYER_WIDTH,   // dest width
      config.PLAYER_HEIGHT,  // dest height
    );
  } else {
    // Fallback: existing procedural drawZebraFrame (already implemented)
    try {
      drawZebraFrame(ctx, config.PLAYER_WIDTH, config.PLAYER_HEIGHT, player.animState, player.animFrame);
    } catch (e) {
      ctx.fillStyle = config.PLAYER_COLOR;
      ctx.fillRect(0, 0, config.PLAYER_WIDTH, config.PLAYER_HEIGHT);
    }
  }

  ctx.restore();
}
```

### Pattern 3: 5-Layer Parallax Background

**What:** Background module rewritten to manage 5 scroll offsets at different speeds. Deep layers use `createLinearGradient` (zero files). Mid/near layers use `createPattern` with tileable PNG strips. Particles are procedural circles.

**When to use:** Replace `background.js` entirely

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createLinearGradient
// background.js (rewrite)

// Layer scroll multipliers (relative to game speed)
const LAYER_SPEEDS = [0.1, 0.2, 0.4, 0.7, 1.0]; // sky, far organic, mid tubule, near detail, ground

export function createBackground() {
  const offsets = [0, 0, 0, 0, 0];  // one offset per layer
  const particles = createParticlePool(20);  // floating biological cells

  return {
    update(gameSpeed, deltaTime) {
      for (let i = 0; i < LAYER_SPEEDS.length; i++) {
        offsets[i] += gameSpeed * LAYER_SPEEDS[i] * deltaTime;
      }
      updateParticles(particles, deltaTime, gameSpeed);
    },

    draw(ctx, config) {
      drawSkyGradient(ctx, config);           // layer 0 — procedural gradient, no offset needed
      drawFarOrganicLayer(ctx, config, offsets[1]);  // layer 1 — procedural blobs
      drawMidTubuleLayer(ctx, config, offsets[2]);   // layer 2 — tileable PNG or procedural
      drawNearDetailLayer(ctx, config, offsets[3]);  // layer 3 — tileable PNG or procedural
      drawParticles(ctx, particles);           // floating cells, own Y positions
      drawGround(ctx, config, offsets[4]);     // layer 4 — existing ground renderer
    },
  };
}

function drawSkyGradient(ctx, config) {
  // Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createLinearGradient
  const grad = ctx.createLinearGradient(0, 0, 0, config.GROUND_Y);
  grad.addColorStop(0,    '#3D1A5E');  // deep purple (top)
  grad.addColorStop(0.45, '#8B2252');  // warm magenta (mid)
  grad.addColorStop(0.80, '#C44B6B');  // coral pink (lower mid)
  grad.addColorStop(1,    '#E8735A');  // orange-coral (ground edge)
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, config.CANVAS_WIDTH, config.GROUND_Y);
}
```

**Tileable PNG layer with `createPattern`:**
```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern
function drawMidTubuleLayer(ctx, config, offset) {
  if (!SPRITES.bgMid) {
    // Procedural fallback: soft sine-wave band of slightly lighter purple
    drawProceduralMidLayer(ctx, config, offset);
    return;
  }
  const pattern = ctx.createPattern(SPRITES.bgMid, 'repeat-x');
  ctx.save();
  ctx.translate(-(offset % SPRITES.bgMid.width), config.GROUND_Y - 60);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, config.CANVAS_WIDTH + SPRITES.bgMid.width, 60);
  ctx.restore();
}
```

### Pattern 4: Screen Shake

**What:** A shake state stored in `main.js` that applies `ctx.translate` at the start of each render pass. All entities draw at their normal coordinates; the translation shifts the entire canvas view.

**When to use:** Triggered by `triggerGameOver()` and gene collection hit (brief)

```javascript
// In main.js — module-level shake state
let shakeIntensity = 0;    // max pixel displacement
let shakeDuration  = 0;    // remaining seconds
const SHAKE_DECAY  = 8;    // intensity decays at this rate per second

function startShake(intensity, duration) {
  shakeIntensity = intensity;  // e.g. 10 for death, 4 for collection
  shakeDuration  = duration;   // e.g. 0.4 for death, 0.15 for collection
}

function applyShake(ctx, deltaTime) {
  if (shakeDuration <= 0) return;

  shakeDuration -= deltaTime;
  const decay = Math.max(0, shakeDuration / 0.4);  // normalized 0-1
  const magnitude = shakeIntensity * decay;

  const dx = (Math.random() * 2 - 1) * magnitude;
  const dy = (Math.random() * 2 - 1) * magnitude;

  ctx.translate(dx, dy);
  // ctx.restore() called later in the frame — restores translation
}

// In gameLoop, at top of render block:
ctx.save();
applyShake(ctx, deltaTime);
// ... render all entities ...
ctx.restore();  // removes shake translation
```

### Pattern 5: Gene Glow Effect

**What:** Set `ctx.shadowBlur` and `ctx.shadowColor` before drawing the gene sprite/circle. Glow pulses by animating `shadowBlur` value with `Math.sin` on `floatOffset`.

**Important:** `shadowColor` must be non-transparent AND `shadowBlur > 0` for any shadow to appear. Set both BEFORE the draw call. Reset to 0 after to avoid bleeding onto other entities.

```javascript
// In collectible.js draw() — gene glow
// Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/shadowBlur
function drawGene(ctx, gene) {
  const glowPulse = 4 + 3 * Math.abs(Math.sin(gene.floatOffset));

  ctx.save();
  ctx.shadowColor = gene.type.color;   // e.g. '#E74C3C' for PKD1
  ctx.shadowBlur  = glowPulse;         // 4-7px pulse

  // Draw sprite or procedural circle
  if (SPRITES.genes) {
    ctx.imageSmoothingEnabled = false;
    const sx = gene.type.spriteIndex * GENE_FRAME_WIDTH;
    ctx.drawImage(SPRITES.genes, sx, 0, GENE_FRAME_WIDTH, GENE_FRAME_HEIGHT,
                  gene.x, gene.y, gene.width, gene.height);
  } else {
    ctx.fillStyle = gene.type.color;
    ctx.beginPath();
    ctx.arc(gene.x + gene.width / 2, gene.y + gene.height / 2, gene.width / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();  // resets shadowBlur to 0
}
```

### Pattern 6: Particle Pool (Gene Collection + Death)

**What:** A simple fixed-size particle array. Each particle has `{x, y, vx, vy, life, maxLife, radius, color}`. Emit on collection/death, tick each frame, skip dead particles.

**Why no library:** The particle requirements are simple (circles with fade), under 30 lines to implement cleanly, and zero dependencies fits the project constraint.

```javascript
// particles.js — factory function pattern (consistent with project style)

export function createParticlePool(maxCount = 50) {
  return Array.from({ length: maxCount }, () => ({ active: false }));
}

export function emitParticles(pool, x, y, color, count = 8) {
  let emitted = 0;
  for (const p of pool) {
    if (!p.active && emitted < count) {
      const angle = (Math.PI * 2 * emitted) / count;
      const speed = 80 + Math.random() * 120;
      p.active  = true;
      p.x       = x;
      p.y       = y;
      p.vx      = Math.cos(angle) * speed;
      p.vy      = Math.sin(angle) * speed - 60;  // slight upward bias
      p.life    = 0;
      p.maxLife = 0.5 + Math.random() * 0.3;  // 0.5-0.8 seconds
      p.radius  = 3 + Math.random() * 4;
      p.color   = color;
      emitted++;
    }
  }
}

export function updateParticles(pool, deltaTime) {
  for (const p of pool) {
    if (!p.active) continue;
    p.life += deltaTime;
    if (p.life >= p.maxLife) { p.active = false; continue; }
    p.x += p.vx * deltaTime;
    p.y += (p.vy + 120 * p.life) * deltaTime;  // gravity on particles
  }
}

export function drawParticles(ctx, pool) {
  for (const p of pool) {
    if (!p.active) continue;
    const alpha = 1 - (p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
```

### Pattern 7: Pixel Art Font (Canvas Text with Pixel Font Style)

**What:** For the start screen "KidneyQuest" title and "Collect the Genes!" tagline: use `ctx.fillText` with a large bold font rendered at the correct size, then overlay pixel-grid-style letter-spacing. The simplest approach is a web-safe monospace font at large size combined with `ctx.scale` that creates a blocky look.

**Full pixel bitmap font:** A custom font where each character is defined as a grid of pixels. This is 200+ lines of font data. Only worth doing if the visual result absolutely cannot be achieved with styled system fonts.

**Recommended approach (Claude's discretion):** Use "Press Start 2P" font loaded via a data URL embedded in the HTML, OR use bold monospace canvas text (no external files) styled with letter-spacing and pixel-crisp rendering. The CONTEXT.md says "pixel art font style (drawn on canvas, no external font files)" — interpret as: draw large, bold, blocky text using canvas primitives that reads as pixel-art-styled without requiring a real bitmap font file.

```javascript
// Canvas-drawn "pixel art style" title — uses ctx.font with a bold, large monospace font
// Then adds a dark border stroke for the "pixel art border" look

function drawPixelStyleTitle(ctx, text, x, y, size, color) {
  ctx.save();
  ctx.font = `bold ${size}px monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Dark outline for "pixel art" border effect
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = size * 0.08;
  ctx.strokeText(text, x, y);

  // Main fill
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);

  ctx.restore();
}
```

### Anti-Patterns to Avoid

- **Setting shadowBlur globally without restoring:** Will make ALL subsequent drawing have a glow. Always wrap in `ctx.save()` / `ctx.restore()`.
- **Loading sprites inside the draw loop:** Every frame would call `new Image()`. Load once on init, store in module-level variable.
- **Non-integer drawImage coordinates for pixel art:** Sub-pixel positions cause blur even with `imageSmoothingEnabled = false`. Use `Math.round()` on x/y before `drawImage`.
- **Forgetting `imageSmoothingEnabled = false` after canvas resize:** `setupCanvas` in renderer.js calls `ctx.scale(dpr, dpr)` — this does NOT reset `imageSmoothingEnabled`. However, `window.resize` calls `resizeCanvas` which only changes CSS size, not the context. Set `imageSmoothingEnabled = false` once after `setupCanvas` and it persists.
- **Parallax offsets growing unbounded:** Large float values (offsets in the millions after long play sessions) cause precision loss. Apply modulo: `offset = offset % (layerWidth)` each frame.
- **Gene glow bleeding onto obstacle:** `ctx.save()`/`ctx.restore()` around every entity draw — never set shadow globally.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Image loading with error handling | Custom callback hell | `img.decode()` with try/catch | decode() returns a Promise; errors are typed EncodingError; consistent async pattern |
| Sprite sheet frame math | Custom frame calculator per entity | Single `FRAME_START` lookup table | One source of truth; easy to update when art changes |
| Tileable background scrolling | Custom double-buffer tile system | `createPattern()` + `ctx.translate()` | Browser handles repeat; translate provides scroll offset; no tile-boundary math |
| Particle system | External particle library | Custom 30-line pool (see Pattern 6) | Simpler requirements; no dependency; pool avoids GC pressure |
| Screen shake camera | External camera/viewport module | `ctx.translate` with save/restore (Pattern 4) | No camera concept needed; translate is equivalent |

**Key insight:** Canvas 2D already provides all primitives needed. The project constraint of zero dependencies is achievable without any hand-rolled complexity.

## Common Pitfalls

### Pitfall 1: Sprites Not Crisp at 64px Game Scale

**What goes wrong:** The zebra sprite, designed at 64x64, renders blurry at game scale. The existing canvas uses `ctx.scale(dpr, dpr)` for Retina which makes the problem worse.
**Why it happens:** `imageSmoothingEnabled` defaults to `true`. Any `drawImage` with scaling (even 1:1 at non-integer DPR-adjusted coordinates) applies bilinear interpolation.
**How to avoid:** Set `ctx.imageSmoothingEnabled = false` immediately after `setupCanvas()` in `main.js`. Also set `image-rendering: pixelated` in `css/style.css` on the canvas element.
**Warning signs:** Sprite appears slightly blurry or has soft edges when zoomed in.

### Pitfall 2: Sprite Load Race — Drawing Before Image Ready

**What goes wrong:** `ctx.drawImage(img, ...)` called before `img.complete` — throws `InvalidStateError` or draws nothing.
**Why it happens:** `img.src` assignment starts network fetch, but `img.decode()` / `img.onload` haven't fired when the first game loop frame runs.
**How to avoid:** `await loadSprites()` before calling `requestAnimationFrame(gameLoop)` in `main.js`. If any sprite fails, `SPRITES[key]` stays `null` and the existing procedural fallback runs.
**Warning signs:** Console shows `InvalidStateError` or `EncodingError`. Sprites intermittently appear on reload.

### Pitfall 3: Parallax Offset Float Precision Loss

**What goes wrong:** After several minutes of play, background layers start jittering or positions become imprecise.
**Why it happens:** `offset` values keep accumulating — at 200px/s × 600 seconds = 120,000px. Floating point arithmetic at large values loses precision.
**How to avoid:** Apply modulo wrap each frame: `offsets[i] = offsets[i] % wrapWidth` where `wrapWidth` is the pattern's tile width or gradient repeat distance.
**Warning signs:** Background looks correct for 30 seconds, then gradually drifts or stutters.

### Pitfall 4: Screen Shake Residual Translation

**What goes wrong:** After shake ends, all entities are drawn offset from their correct position.
**Why it happens:** `ctx.translate(dx, dy)` is cumulative. If `ctx.restore()` is not called, the translation stacks across frames.
**How to avoid:** Always wrap the entire shake+draw block in `ctx.save()` / `ctx.restore()`. The save at top of gameLoop, restore at bottom.
**Warning signs:** Player and ground appear to drift left/right permanently after a death event.

### Pitfall 5: shadowBlur Performance on Low-End Devices

**What goes wrong:** Frame rate drops to 30fps when multiple genes are visible simultaneously.
**Why it happens:** Each `shadowBlur` call forces a per-draw-call GPU blur pass. Multiple shadowed elements per frame are expensive.
**How to avoid:** Limit shadowBlur to genes only (not obstacles, not background). Use `shadowBlur` values of 4-8px (not 20+). Avoid applying shadow to large filled rectangles.
**Warning signs:** DevTools frame timeline shows GPU-heavy frames when 3+ genes are on screen.

### Pitfall 6: Death Animation State Not Added to ANIM_STATES

**What goes wrong:** Zebra sprite has a `death` animation, but `ANIM_STATES` in `player.js` and `ZEBRA_FRAME_START` in `renderer.js` don't include it. Player draws nothing on death.
**Why it happens:** `ANIM_STATES` is internal to `player.js` and defines valid states. If `death` isn't listed, `updateAnimState` falls back to `idle`.
**How to avoid:** Add `death: { frames: 4, fps: 8, loop: false }` to `ANIM_STATES` in `player.js`. Add `death: 19` to `ZEBRA_FRAME_START`. Trigger `player.animState = 'death'` in `triggerGameOver()` before the state machine in `player.js` can override it — requires a `frozen` flag on the player.
**Warning signs:** No death tumble animation plays; zebra immediately freezes in run/idle pose on death.

### Pitfall 7: Inconsistent Module Patterns (Class vs Factory)

**What goes wrong:** `background.js` currently uses `class Background` (inconsistent with the factory function pattern used everywhere else). Phase 6 rewrites background.js — maintain consistency.
**Why it happens:** `background.js` was written early before the factory function pattern was established.
**How to avoid:** Rewrite `background.js` as `export function createBackground()` returning a plain object. Update `main.js` to use the factory pattern.
**Warning signs:** Code review notes inconsistency; workshop participants confused by two patterns.

## Code Examples

Verified patterns from official sources:

### Sprite Sheet Frame Extraction (9-parameter drawImage)

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage
// Draw frame 5 from a horizontal strip sheet
const FRAME_W = 64;
const FRAME_H = 80;
const frameIndex = 5;

ctx.drawImage(
  spriteSheet,          // HTMLImageElement
  frameIndex * FRAME_W, // sx: x position of frame in sheet
  0,                    // sy: y position (single row = 0)
  FRAME_W,              // sWidth: source width to extract
  FRAME_H,              // sHeight: source height to extract
  destX,                // dx: canvas destination x
  destY,                // dy: canvas destination y
  FRAME_W,              // dWidth: rendered width (same = no scaling)
  FRAME_H,              // dHeight: rendered height
);
```

### Crisp Pixel Art Setup

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled
// Run once after setupCanvas(), before first gameLoop frame
ctx.imageSmoothingEnabled = false;
```

```css
/* css/style.css — prevents browser from blurring scaled canvas */
canvas {
  image-rendering: pixelated;
}
```

### Image Load with decode() and Fallback

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode
async function loadImage(src) {
  const img = new Image();
  img.src = src;
  try {
    await img.decode();
    return img;         // fully decoded, safe to drawImage immediately
  } catch (e) {
    return null;        // caller checks null, uses procedural fallback
  }
}
```

### Warm Kidney Interior Sky Gradient (5 stops)

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createLinearGradient
// Palette recommendation (Claude's discretion):
// Deep purple → warm magenta → coral pink → orange-coral
const grad = ctx.createLinearGradient(0, 0, 0, GROUND_Y);
grad.addColorStop(0,    '#2E0D4E');  // very deep purple
grad.addColorStop(0.30, '#7B1D5A');  // warm deep magenta
grad.addColorStop(0.60, '#C44B6B');  // coral rose
grad.addColorStop(0.85, '#E06B42');  // orange-coral
grad.addColorStop(1,    '#E8845A');  // warm terracotta at ground
ctx.fillStyle = grad;
ctx.fillRect(0, 0, CANVAS_WIDTH, GROUND_Y);
```

### Scrolling Pattern with createPattern

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern
// Called each frame — pattern is created from pre-loaded image
function drawScrollingLayer(ctx, img, offset, y, height, canvasWidth) {
  const pattern = ctx.createPattern(img, 'repeat-x');
  ctx.save();
  ctx.translate(-(offset % img.width), y);
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, canvasWidth + img.width, height);
  ctx.restore();
}
```

### Shadow/Glow Effect (Gene collectible)

```javascript
// Source: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/shadowBlur
// Glow must be set BEFORE drawing — not after
ctx.save();
ctx.shadowColor = '#E74C3C';   // gene color
ctx.shadowBlur  = 6;           // 4-8px is readable without GPU stress
ctx.fillStyle   = '#E74C3C';
ctx.beginPath();
ctx.arc(cx, cy, radius, 0, Math.PI * 2);
ctx.fill();
ctx.restore();                 // resets shadowBlur to 0
```

## Recommended Palette (Claude's Discretion)

The CONTEXT.md leaves exact hex colors to Claude. These choices maximize B&W zebra contrast against warm backgrounds:

| Color Name | Hex | Use |
|------------|-----|-----|
| Deep Space Purple | `#2E0D4E` | Sky gradient top |
| Warm Magenta | `#7B1D5A` | Sky gradient mid |
| Coral Rose | `#C44B6B` | Sky gradient lower |
| Orange Coral | `#E06B42` | Sky at ground edge |
| Bio Membrane | `#A63060` | Organic blob far layer (slightly lighter than sky) |
| Nephron Tube | `#D47090` | Mid layer tube walls |
| Near Edge | `#F09080` | Near detail strips (lightest layer, most visible) |
| Particle Glow | `#FFD4E0` | Floating cell particles (almost white-pink) |

**Zebra remains pure `#FFFFFF` body / `#111111` stripes** — no palette changes needed to character.

## Recommended Claude's Discretion Decisions

The following are areas left to Claude's discretion in CONTEXT.md, with concrete recommendations:

| Decision Area | Recommendation | Rationale |
|---------------|----------------|-----------|
| Sprite sheet format | Horizontal strip (all frames in one row) | Simpler math: `frameIndex * FRAME_W = sx`. No row/column arithmetic needed |
| Gene glow implementation | `ctx.shadowBlur` (4-8px), not sprite-based | Zero extra art assets; pulsing via Math.sin on existing floatOffset |
| Pixel art font | Bold monospace + stroke outline technique | Avoids external font files; achieves "blocky" look; 10 lines of code |
| Particle count per burst | 8-10 particles for collection, 12-15 for death | Visually satisfying; within performance budget (1-2ms per burst) |
| Screen shake intensity | 8px for death, 3px for gene collection | Death should be jarring; collection should be perceptible but not distracting |
| Screen shake duration | 0.35s for death, 0.12s for collection | Fast enough to not interrupt gameplay flow |
| Obstacle sprite design | Kidney stone: rough rounded gray polygon; Blockage: brownish organic plug; Cyst: purple bubble with lighter center | Matches existing CONFIG colors; distinctive silhouettes at game scale |
| Gene visual differentiation | Differentiate by shape (not just color): PKD1/PKD2 = round helix icon; COL4A5 = rectangular chain; NPHS1/NPHS2 = oval filter; WT1 = star | Shape + color redundancy; readable for colorblind players |
| Frame timing | run: 12fps (existing); idle: 6fps; jump/fall: 8fps; land: 18fps (squash fast); death: 10fps | Matches player.js ANIM_STATES; feel-tested in Phase 2 |
| Death animation timing | 0.5s death tumble, then 1.0s freeze before game over text | Existing GAME_OVER_FREEZE_DELAY is 1.0s; tumble adds 0.5s of drama first |

## State of the Art

| Old Approach | Current Approach | Status |
|--------------|------------------|--------|
| `img.onload` callback | `img.decode()` returning Promise | Current best practice; Promise-based; baseline since Jan 2020 |
| `webkitImageSmoothingEnabled` | `imageSmoothingEnabled` (no prefix) | Unprefixed version is standard; widely supported since Apr 2017 |
| Multiple separate image files | Sprite sheet (atlas) | Standard game dev practice; fewer HTTP requests, one cache entry |
| `ctx.fillRect` colored rectangles | `ctx.drawImage` from sprite sheet | The Phase 6 transition itself |

**Deprecated/outdated:**
- Vendor-prefixed `webkitImageSmoothingEnabled`: Do not use. The standard `imageSmoothingEnabled` is universally supported.
- `img.onload` with nested callbacks: Still works but prefer `img.decode()` for cleaner async flow.
- Class-based `Background`: Replace with factory function pattern consistent with project style.

## Open Questions

1. **PixelLab sprite generation quality**
   - What we know: PixelLab has an Aseprite plugin and API; it's the locked decision for primary sprite generation.
   - What's unclear: Whether PixelLab can reliably generate a 64x80px chibi zebra horizontal sprite sheet with consistent frame boundaries. Output quality varies by prompt.
   - Recommendation: Generate sprites before coding the sprite loader. If output is unsatisfactory after 3-4 prompt iterations, fall back to the procedural `drawZebraFrame` already in `renderer.js` and treat visual polish as "enhanced procedural" rather than sprite-based.

2. **Performance of 5-layer parallax on mobile**
   - What we know: Each layer requires one draw call per frame; total is 5-8 draw calls for background.
   - What's unclear: Whether `createPattern()` + translate is GPU-efficient enough for low-end Android in a workshop context.
   - Recommendation: Implement layers 0-2 (procedural gradient + 2 pattern layers) first. Test frame rate. Add layers 3-4 only if performance remains above 55fps.

3. **Background PNG asset creation workflow**
   - What we know: "2-3 small tileable PNG strips" for mid/near layers; generated via PixelLab or Nano Banana.
   - What's unclear: Exact pixel dimensions for seamless tiling. A strip must tile horizontally without visible seams.
   - Recommendation: Target 200x60px strips for mid-layer, 300x40px for near-layer. Test tiling in a simple HTML page before integrating. Alternatively, skip mid-layer PNGs entirely and use procedural sinusoidal bands — the fallback path already handles this and may be indistinguishable from pixel art strips at game scale.

4. **Death animation: player.js ANIM_STATES must be extended**
   - What we know: `player.js` has `ANIM_STATES` without a `death` state. The `updateAnimState` function will override any external state assignment unless death is a recognized state.
   - What's unclear: Whether adding `death` to `ANIM_STATES` requires changes to the state transition logic in `updateAnimState`, or if a `player.frozen` flag can bypass it.
   - Recommendation: Add `player.frozen = false` property. When `true`, `updateAnimState` returns immediately without overriding `animState`. Set `player.frozen = true` and `player.animState = 'death'` in `triggerGameOver()`. This is the minimal change.

## Sources

### Primary (HIGH confidence)

- MDN Web Docs — `CanvasRenderingContext2D.drawImage` — https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage — 9-parameter sprite clipping API verified
- MDN Web Docs — `HTMLImageElement.decode()` — https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/decode — Promise-based image loading, browser support (Jan 2020+), EncodingError type
- MDN Web Docs — `imageSmoothingEnabled` — https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled — Pixel art crisp rendering, persistence behavior, browser support (Apr 2017+)
- MDN Web Docs — `createLinearGradient` — https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createLinearGradient — Gradient API, addColorStop
- MDN Web Docs — `createPattern` — https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/createPattern — Tileable repeat with translate scroll pattern
- MDN Web Docs — `shadowBlur` — https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/shadowBlur — Glow effect API, must set shadowColor, browser support (July 2015+)
- MDN Web Docs — Crisp pixel art look — https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look — `image-rendering: pixelated` CSS, integer scale requirement

### Secondary (MEDIUM confidence)

- SpicyYoghurt Canvas Tutorial — https://spicyyoghurt.com/tutorials/html5-javascript-game-development/images-and-sprite-animations — Sprite sheet animation pattern with frame column/row extraction; verified against MDN drawImage
- Jonny Morrill blog — https://jonny.morrill.me/en/blog/gamedev-how-to-implement-a-camera-shake-effect/ — Screen shake decay implementation; technique verified against MDN translate API

### Tertiary (LOW confidence)

- WebSearch: "Canvas 2D screen shake implementation" — general community patterns; implementation adapted to project's save/restore pattern
- WebSearch: "pixel art font bitmap canvas" — PaulBGD/PixelFont approach noted; full bitmap font not recommended for this project scale

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all Canvas 2D APIs verified against MDN official documentation
- Architecture: HIGH — patterns derived from verified API behaviors and existing codebase analysis
- Pixel art palette: MEDIUM — color choices are aesthetic/discretionary, no official source
- Sprite generation workflow: MEDIUM — PixelLab locked decision per CONTEXT.md but output quality is uncertain
- Pitfalls: HIGH — derived from verified API documentation (imageSmoothingEnabled, shadowBlur behavior, decode() error types)

**Research date:** 2026-02-18
**Valid until:** 2026-06-01 (Canvas 2D APIs are stable; no expected breaking changes)
