# Phase 5: Collectibles + Scoring - Research

**Researched:** 2026-02-18
**Domain:** Vanilla JS Canvas collectible mechanics, HUD rendering, floating text particles, speed ramp curves, localStorage persistence, game over educational overlay
**Confidence:** HIGH (core patterns verified via MDN and prior phase research); MEDIUM (medical data verified via OMIM); LOW (gene color palette — aesthetic judgment only)

## Summary

Phase 5 delivers the complete gameplay loop: gene collectible spawning with floating animation, on-screen HUD (distance + gene count), collection feedback (floating "+N" popups, brief gene name flash), progressive difficulty ramp, and a rich game over screen with gene education content, high score tracking via localStorage, and restart flow. All implementation is vanilla JS Canvas — no new dependencies are needed.

**Architecture reality check (critical):** The class-based files currently in the repo (`game.js`, `player.js`, `collectible.js`, `score.js`, `obstacle.js`, `background.js`) use broken named imports (`import { GAME_WIDTH } from './config.js'`) from a default-export config. Phase 4 research explicitly documented these as incompatible stubs. Phase 5 must continue the functional-in-main.js pattern established in Phases 1-3 and continued in Phase 4. Do NOT wire up the class-based files. Gene collectibles, scoring, and the game over screen all live as plain objects and functions in `main.js` and `renderer.js`, following the same pattern as obstacles.

**Gene data in config.js** needs expanding: the three locked gene types (PKD1, COL4A5, NPHS1) must gain `diseaseName`, `description`, `inheritance`, `omimId`, `omimUrl`, and `geneReviewsUrl` fields. The existing `GENE_TYPES` array already has `name`, `color`, `points` — these need the new educational fields merged in.

**Primary recommendation:** Implement collectibles as plain objects (mirror of the obstacle pattern), scoring as accumulated state variables in main.js, floating text popups as a short-lived particle array, and the game over screen as multi-section canvas rendering with expandable detail state tracked via a simple variable. localStorage high score is a single `JSON.parse/stringify` call — no library needed.

## Standard Stack

No new dependencies. Phase 5 is fully vanilla JS Canvas API, consistent with Phases 1-4.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| HTML5 Canvas 2D API | Browser native | All rendering — collectibles, HUD, floating text, game over | Already established and in use |
| requestAnimationFrame | Browser native | Game loop — collectible update and draw per frame | Already in use |
| ES Modules | ES2015+ | Code organisation | Already established |
| localStorage | Browser native | Persist high score across sessions | Built-in, no library, works offline |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | — | — | All Phase 5 features achievable with existing vanilla setup |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| localStorage for high score | sessionStorage | sessionStorage clears on tab close — localStorage survives, motivates replay |
| localStorage for high score | IndexedDB | IndexedDB is async and more complex; 5MB localStorage is ample for a single high score value |
| Canvas-rendered game over | HTML overlay div | HTML DOM overlay over canvas is possible but conflicts with the canvas-only POC constraint; canvas rendering keeps the entire game in one layer |
| Float offset stored per gene | Shared sine clock | Per-gene phase offset (seeded randomly) creates organic variation; shared clock makes all genes bob in sync — avoid |

**Installation:**
```bash
# No installation needed — all native browser APIs
# Already configured in project
```

## Architecture Patterns

### Recommended File Changes

Phase 5 modifies existing files only. No new files are strictly required.

```
js/
├── config.js     # EXTEND: GENE_TYPES — add diseaseName, description, inheritance,
│                 #         omimId, omimUrl, geneReviewsUrl fields to all 3 gene entries.
│                 #         ADD: COLLECTIBLE_SPAWN_BASE_INTERVAL, COLLECTIBLE_SPAWN_VARIATION,
│                 #             COLLECTIBLE_FLOAT_AMPLITUDE, COLLECTIBLE_FLOAT_FREQ,
│                 #             SPEED_INCREMENT, MAX_SPEED (verify present),
│                 #             RESTART_COOLDOWN (1.5s), GENE_LABEL_FLASH_DURATION (1.0s)
│
├── main.js       # EXTEND: add gene collectible array + spawn logic (same pattern as obstacles),
│                 #         floating popup particle array, score state (distance, geneScore,
│                 #         genesCollected with full type data), highScore from localStorage,
│                 #         gameOverExpandedGene (which gene card is expanded, or null),
│                 #         game over cooldown timer, gene name flash state.
│                 #         EXTEND update(): difficulty ramp (speed increases over time),
│                 #         collectible update + AABB collection check, popup particle update.
│                 #         EXTEND render(): HUD, gene name flash, popup particles,
│                 #         collectible draw, game over education screen.
│
└── renderer.js   # EXTEND: drawCollectible() — colored rect + text label,
│                 #         drawHUD() — top-right score display,
│                 #         drawGeneNameFlash() — brief flash text near gene counter,
│                 #         drawPopupParticles() — floating "+N" text,
│                 #         drawGameOverScreen() — full educational breakdown.
```

### Pattern 1: Gene Collectible as Plain Object

**What:** Represent each active gene as a plain JavaScript object with a per-instance float phase offset.
**When to use:** Every gene spawn. Mirror of the obstacle pattern from Phase 4.

```javascript
// Source: Phase 4 research pattern (plain object array); float offset is standard
// sine-wave bobbing approach confirmed in Chrome Dino collectible implementations.

function createGene(type, config) {
  // type = one entry from CONFIG.GENE_TYPES
  // y position: spawn in the mid-air zone reachable by jump
  // GROUND_Y = 600, jump apex at ~250 — spawn in 220-350 range for risk/reward
  const spawnY = 220 + Math.random() * 130;

  return {
    type: type.name,           // 'PKD1' | 'COL4A5' | 'NPHS1'
    typeData: type,            // full config entry — needed for education screen
    x: config.CANVAS_WIDTH + 20,
    y: spawnY,
    baseY: spawnY,             // float oscillates around this fixed Y
    width: 30,
    height: 30,
    color: type.color,
    points: type.points,
    floatPhase: Math.random() * Math.PI * 2, // random phase so genes don't all bob in sync
    dead: false,
  };
}

function updateGenes(genes, deltaTime, speed, config) {
  const AMPLITUDE = config.COLLECTIBLE_FLOAT_AMPLITUDE || 8;   // px, half peak-to-peak
  const FREQ = config.COLLECTIBLE_FLOAT_FREQ || 2.0;           // Hz (cycles per second)

  genes.forEach(gene => {
    gene.x -= speed * deltaTime;
    gene.floatPhase += FREQ * 2 * Math.PI * deltaTime;         // advance phase
    gene.y = gene.baseY + Math.sin(gene.floatPhase) * AMPLITUDE;

    if (gene.x + gene.width < 0) gene.dead = true;
  });

  return genes.filter(g => !g.dead);
}
```

**Float parameters — Claude's Discretion recommendation:**
- Amplitude: 8px (visible but not distracting at 720px canvas height)
- Frequency: 2.0 Hz (slow enough to read, not jittery)
- Phase offset: random per gene (organic variation, prevents choreographed look)

### Pattern 2: Gene Collection via AABB Check

**What:** Check each gene against the player hitbox each frame; on hit, record the gene, award points, trigger feedback, remove gene.
**When to use:** Every frame while RUNNING.

```javascript
// Source: Phase 4 AABB collision pattern; same shrink approach
// Gene hitbox is NOT shrunk (player must get close — reward feels fair)

function checkGeneCollisions(genes, player, onCollect) {
  genes.forEach(gene => {
    if (gene.dead) return;
    // Simple AABB — no shrink (gene should be easy to collect, contrast with obstacles)
    if (
      player.x < gene.x + gene.width &&
      player.x + player.width > gene.x &&
      player.y < gene.y + gene.height &&
      player.y + player.height > gene.y
    ) {
      onCollect(gene);
      gene.dead = true;
    }
  });
}
```

### Pattern 3: Collectible Spawn Accumulator

**What:** Delta-time accumulator for gene spawning — same pattern as obstacle spawning.
**When to use:** Gene spawn timer updates.

```javascript
// Source: Phase 4 delta-time accumulator pattern — identical structure to obstacle spawner

let geneSpawnTimer = 0;

function updateGeneSpawnTimer(deltaTime, config) {
  geneSpawnTimer += deltaTime;
  const interval = config.COLLECTIBLE_SPAWN_BASE_INTERVAL
    + (Math.random() - 0.5) * 2 * config.COLLECTIBLE_SPAWN_VARIATION;

  if (geneSpawnTimer >= interval) {
    geneSpawnTimer -= interval; // subtract to preserve remainder, not set to 0
    const type = CONFIG.GENE_TYPES[Math.floor(Math.random() * CONFIG.GENE_TYPES.length)];
    genes.push(createGene(type, CONFIG));
  }
}
```

**Recommended config values (Claude's Discretion):**
```javascript
COLLECTIBLE_SPAWN_BASE_INTERVAL: 3.5, // seconds between gene spawns
COLLECTIBLE_SPAWN_VARIATION: 1.5,     // +/- seconds of randomness
```
This yields intervals of 2-5 seconds, giving the player 1-2 genes visible at a time.

### Pattern 4: Difficulty Ramp — Smooth Continuous Speed Increase

**What:** Each frame while RUNNING, increment speed by `SPEED_INCREMENT * deltaTime`. Cap at `MAX_SPEED`.
**When to use:** Always in RUNNING state update.

```javascript
// Source: Linear speed ramp is already in config (SPEED_INCREMENT: 5, MAX_SPEED: 500).
// Verified against Phase 4 research — config already established this pattern.
// NOTE: The existing config values (SPEED_INCREMENT: 5 px/s/s, MAX_SPEED: 500 px/s) produce:
//   - 0s:   200 px/s (start speed)
//   - 30s:  350 px/s (already feeling fast)
//   - 60s:  500 px/s (cap hit)
// For a 30-60s easy start, SPEED_INCREMENT should be LOW. Recommend reducing.

currentSpeed = Math.min(currentSpeed + CONFIG.SPEED_INCREMENT * deltaTime, CONFIG.MAX_SPEED);
```

**Recommended config values (Claude's Discretion — override existing):**
```javascript
GAME_SPEED: 200,          // px/s initial (keep existing)
SPEED_INCREMENT: 2,       // px/s per second — reduced from 5 for gentler ramp
                          // At 2 px/s/s: takes 150 seconds to hit cap (2.5 min run to cap)
                          // First 30s: 200 → 260 px/s (barely noticeable)
                          // First 60s: 200 → 320 px/s (starting to feel faster)
MAX_SPEED: 500,           // px/s cap (keep existing)
```

**Spawn frequency also increases with difficulty:**
```javascript
// Spawn interval shrinks as speed increases.
// Tie spawn interval to speed ratio: faster speed = shorter interval.
const speedRatio = currentSpeed / CONFIG.GAME_SPEED; // 1.0 at start, 2.5 at cap
const baseInterval = CONFIG.OBSTACLE_SPAWN_BASE_INTERVAL / speedRatio;
```

### Pattern 5: Score State Variables

**What:** Track score as plain variables in main.js scope. Update distance each frame, award gene points on collection.
**When to use:** RUNNING state.

```javascript
// Source: Phase 3 distance counter pattern + standard endless runner score tracking

let distance = 0;          // raw px scrolled since run start
let geneScore = 0;         // total points from gene collection
let collectedGenes = [];   // array of typeData objects for gene education on game over

const PX_PER_METER = 10;   // 10 canvas px = 1 displayed meter

// In update() when RUNNING:
distance += currentSpeed * deltaTime;

// On gene collection:
function onGeneCollected(gene) {
  geneScore += gene.points;
  collectedGenes.push(gene.typeData);       // preserve full type data for game over
  spawnCollectionPopup(gene.x, gene.y, '+' + gene.points);
  triggerGeneNameFlash(gene.typeData.name);
}

function getTotalScore() {
  return geneScore + Math.floor(distance / PX_PER_METER);
}
```

### Pattern 6: Floating "+N" Popup Particles

**What:** Short-lived text particles that float upward and fade out on gene collection. Managed as an array of particle objects updated each frame.
**When to use:** On every gene collection event.

```javascript
// Source: Standard canvas particle pattern — confirmed approach via MDN globalAlpha docs
// globalAlpha: 0.0 (transparent) to 1.0 (opaque), valid range, widely supported

let popups = [];   // { x, y, text, alpha, vy }

function spawnCollectionPopup(x, y, text) {
  popups.push({
    x: x,
    y: y,
    text: text,
    alpha: 1.0,
    vy: -60,           // px/s upward drift
  });
}

function updatePopups(deltaTime) {
  popups.forEach(p => {
    p.y += p.vy * deltaTime;
    p.alpha -= deltaTime * 1.2;  // fades out in ~0.83 seconds
  });
  popups = popups.filter(p => p.alpha > 0);
}

function drawPopups(ctx) {
  popups.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = '#FFD700';           // gold — visible on dark background
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  });
}
```

**Popup parameters (Claude's Discretion recommendation):**
- Duration: ~0.83 seconds (alpha starts at 1.0, decrements by 1.2/s)
- Upward drift: 60 px/s (enough to clear the gene before fading)
- Color: gold (#FFD700) — arcade classic, visible on dark background

### Pattern 7: Gene Name Flash on Collection

**What:** After collecting a gene, briefly display its name near the gene counter in the HUD.
**When to use:** On collection event; tracked via timer.

```javascript
// Source: Standard timer pattern — confirmed delta-time approach from Phase 3/4 research

let geneFlashName = null;   // name string or null
let geneFlashTimer = 0;     // seconds remaining
const GENE_FLASH_DURATION = 1.0;  // from CONFIG.GENE_LABEL_FLASH_DURATION

function triggerGeneNameFlash(name) {
  geneFlashName = name + '!';
  geneFlashTimer = GENE_FLASH_DURATION;
}

function updateGeneFlash(deltaTime) {
  if (geneFlashTimer > 0) {
    geneFlashTimer = Math.max(0, geneFlashTimer - deltaTime);
    if (geneFlashTimer === 0) geneFlashName = null;
  }
}

// In draw — shown near gene counter in top-right:
function drawGeneFlash(ctx, config) {
  if (!geneFlashName || geneFlashTimer <= 0) return;
  const alpha = Math.min(1.0, geneFlashTimer / 0.3);  // fade out in last 0.3s
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(geneFlashName, config.CANVAS_WIDTH - 20, 60);
  ctx.restore();
}
```

### Pattern 8: HUD Display

**What:** Draw live score in top-right corner during RUNNING state. Format: "1250m | Genes: 5".
**When to use:** RUNNING state render.

```javascript
// Source: Phase 3 distance counter pattern — extended to include gene count.
// "Top-right" = standard arcade placement. Uses renderer.drawText() with align: 'right'.

function drawHUD(ctx, config) {
  const meters = Math.floor(distance / PX_PER_METER);
  const genesCount = collectedGenes.length;

  // Main score line — top right
  drawText(ctx,
    `${meters}m | Genes: ${genesCount}`,
    config.CANVAS_WIDTH - 20,
    30,
    { font: 'bold 22px sans-serif', color: '#FFFFFF', align: 'right', baseline: 'top' }
  );

  // Gene score below
  drawText(ctx,
    `Score: ${getTotalScore()}`,
    config.CANVAS_WIDTH - 20,
    58,
    { font: '18px sans-serif', color: '#FFD700', align: 'right', baseline: 'top' }
  );
}
```

### Pattern 9: localStorage High Score

**What:** Persist the best total score across sessions using localStorage. Read on init, write on game over if new high score.
**When to use:** On game initialization (read) and on game over (write if improved).

```javascript
// Source: gamedevjs.com localStorage pattern — verified standard approach
// localStorage stores strings only — parse/stringify for numbers.
// Wrap in try/catch: private browsing can throw SecurityError on setItem.

const LS_KEY = 'kidneyquest_highscore';

function loadHighScore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? parseInt(raw, 10) : 0;
  } catch (e) {
    return 0;  // localStorage unavailable (private browsing, etc.)
  }
}

function saveHighScore(score) {
  try {
    const current = loadHighScore();
    if (score > current) {
      localStorage.setItem(LS_KEY, String(score));
      return true;  // new high score
    }
    return false;
  } catch (e) {
    return false;
  }
}

// Usage:
let highScore = loadHighScore();   // on game init

// On game over:
const isNewRecord = saveHighScore(getTotalScore());
```

### Pattern 10: Game Over Educational Screen

**What:** Full-canvas game over overlay with score breakdown, collected genes with descriptions, expandable gene detail, and high score comparison. Rendered as canvas drawing.
**When to use:** GAME_OVER state.

```javascript
// Source: Canvas rendering pattern — Phase 3/4 overlay approach.
// The expandable detail is tracked by a simple variable (index of expanded gene, or null).

let gameOverExpandedGene = null;   // index in collectedGenes, or null

// In handleAction() for GAME_OVER:
// - If Space/tap during cooldown: ignore
// - After cooldown: restart
// This means we need a SEPARATE mechanism for expanding gene cards.
// Since the only input is Space/tap (jumps), expand must happen automatically
// or be sequence-based. DECISION: no interactive expand on touch/space — instead,
// game over screen cycles through all collected genes with full detail automatically.
// OR: implement expand via a subtle touch-area on canvas (Phase 6 scope risk).
//
// RECOMMENDATION: Show all collected genes with full short description automatically.
// The "expandable" detail (inheritance pattern + OMIM link) is shown by default for
// each gene, since workshop participants want to see all info. No interaction needed.
// Scrolling for many genes is out of scope — cap visible gene cards at 5 most recent.

function drawGameOverScreen(ctx, config) {
  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 10, 0.88)';
  ctx.fillRect(0, 0, config.CANVAS_WIDTH, config.CANVAS_HEIGHT);

  const cx = config.CANVAS_WIDTH / 2;
  const isNewRecord = (getTotalScore() >= highScore && highScore > 0);

  // Title
  drawText(ctx, 'GAME OVER', cx, 60,
    { font: 'bold 48px sans-serif', color: '#FF4444' });

  // Score breakdown
  const meters = Math.floor(distance / PX_PER_METER);
  drawText(ctx, `Distance: ${meters}m`, cx, 120,
    { font: '24px sans-serif', color: '#FFFFFF' });
  drawText(ctx, `Gene Score: ${geneScore}`, cx, 150,
    { font: '24px sans-serif', color: '#FFFFFF' });
  drawText(ctx, `Total: ${getTotalScore()}`, cx, 185,
    { font: 'bold 28px sans-serif', color: '#FFD700' });

  // High score comparison
  if (isNewRecord) {
    drawText(ctx, 'NEW HIGH SCORE!', cx, 215,
      { font: 'bold 20px sans-serif', color: '#00FF88' });
  } else {
    drawText(ctx, `Best: ${highScore}`, cx, 215,
      { font: '18px sans-serif', color: '#AAAAAA' });
  }

  // Gene cards (up to 5 most recent)
  const displayGenes = collectedGenes.slice(-5);
  drawGeneCards(ctx, config, displayGenes);

  // Restart prompt (after cooldown)
  if (gameOverTimer >= config.RESTART_COOLDOWN) {
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(gameOverTimer * 2.5));
    drawText(ctx, 'Press Space to restart', cx, config.CANVAS_HEIGHT - 40,
      { font: '22px sans-serif', color: '#FFFFFF', alpha: pulse });
  }
}

function drawGeneCards(ctx, config, genes) {
  if (genes.length === 0) return;

  const cardW = 480;
  const cardH = 72;
  const cardX = (config.CANVAS_WIDTH - cardW) / 2;
  let cardY = 250;

  genes.forEach(gene => {
    // Card background
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.fillRect(cardX, cardY, cardW, cardH);

    // Left color stripe (gene color)
    ctx.fillStyle = gene.color;
    ctx.fillRect(cardX, cardY, 6, cardH);

    // Gene name + points
    drawText(ctx, `${gene.name}  (+${gene.points}pts)`,
      cardX + 20, cardY + 18,
      { font: 'bold 16px sans-serif', color: gene.color, align: 'left', baseline: 'top' });

    // Disease name
    drawText(ctx, gene.diseaseName,
      cardX + 20, cardY + 36,
      { font: '13px sans-serif', color: '#CCCCCC', align: 'left', baseline: 'top' });

    // Short description
    drawText(ctx, gene.description,
      cardX + 20, cardY + 52,
      { font: '12px sans-serif', color: '#999999', align: 'left', baseline: 'top' });

    cardY += cardH + 8;
  });
}
```

**Note on interactive expand:** The CONTEXT.md decision mentions expandable gene detail (inheritance + OMIM link). Since the only input is Space/tap (used for restart), true interactive expansion is not achievable without adding new input (mouse click or scroll). Recommendation: Display all information (including inheritance and OMIM ID) in the card without requiring interaction. OMIM URLs cannot be clickable in a canvas-only game. Consider adding OMIM IDs as text ("OMIM: 173900") so clinically-minded participants can look them up.

### Pattern 11: Game Over Restart Cooldown

**What:** Ignore Space/tap for `RESTART_COOLDOWN` seconds after game over, then allow restart.
**When to use:** GAME_OVER state input handling.

```javascript
// Source: Phase 3 pattern — confirmed correct from cooldown timer approach

let gameOverTimer = 0;  // accumulates since GAME_OVER entry

// In update() when GAME_OVER:
gameOverTimer += deltaTime;

// In handleAction() for GAME_OVER:
function handleAction() {
  if (gameState === 'GAME_OVER') {
    if (gameOverTimer >= CONFIG.RESTART_COOLDOWN) {
      resetGame();
    }
    // else: ignore — still in cooldown
  }
  // ...
}
```

**Recommended config value (Claude's Discretion):**
```javascript
RESTART_COOLDOWN: 1.5,   // seconds before Space is accepted on game over screen
                         // Long enough to read score, short enough to not frustrate
```

### Pattern 12: Gene Collectible Draw

**What:** Draw gene as a colored rectangle with gene name text label above it.
**When to use:** Every frame when genes are present.

```javascript
// Source: POC visual style decision — colored rect + text, no sprites until Phase 6.
// Text above rect is more readable than text inside the small 30x30 rect.

function drawGene(ctx, gene) {
  // Colored rectangle
  ctx.fillStyle = gene.color;
  ctx.fillRect(gene.x, gene.y, gene.width, gene.height);

  // Optional inner glow/border for visibility
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 1;
  ctx.strokeRect(gene.x + 0.5, gene.y + 0.5, gene.width - 1, gene.height - 1);

  // Gene name label above the rect
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.fillText(gene.type, gene.x + gene.width / 2, gene.y - 2);
}
```

### Anti-Patterns to Avoid

- **Shared sine phase for all genes:** All genes bobbing in sync looks artificial. Each gene must have its own `floatPhase` initialized to `Math.random() * Math.PI * 2`.
- **Updating `gene.y` directly without `gene.baseY`:** If you only track `gene.y`, each frame's sine result compounds with the previous frame's Y offset. Store `baseY` as the spawn Y, compute `gene.y = gene.baseY + sin(phase) * amplitude` each frame.
- **Using `setItem` without try/catch:** Private browsing mode (incognito) throws `SecurityError` on `localStorage.setItem`. Always wrap in try/catch.
- **Setting `geneSpawnTimer = 0` on spawn:** Subtract the interval to preserve remainder time. Setting to 0 causes long-run drift.
- **Canvas-rendered OMIM links that users can click:** Canvas elements cannot contain hyperlinks. Either display the OMIM ID as text (copyable from source) or add the links as HTML anchor elements below the canvas — but HTML overlay complicates the POC. The cleanest solution is to display OMIM IDs as text only.
- **Displaying all collected genes regardless of count:** If a player collects 20+ genes, the game over screen overflows. Cap the display at 5 most recent, or summarize with a count.
- **Running speed ramp in GAME_OVER state:** Speed must freeze when game over is triggered. Only increment speed in RUNNING state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent high score | Custom cookie/session solution | `localStorage.getItem/setItem` with JSON | Synchronous, simple, 5MB limit, widely supported |
| Floating text particles | Third-party particle library | Plain object array with alpha/position updated per frame | This project has zero-dependency constraint; the pattern is 10 lines |
| Gene type lookup by name | Dynamic object/map structure | Direct array iteration (`GENE_TYPES.find(g => g.name === name)`) | Config array is small; find() is fast enough; keeps data co-located |
| Spawn interval jitter | Dedicated noise library | `base + (Math.random() - 0.5) * 2 * variation` | Uniform random is sufficient for spawn variation |
| Smooth sine float | Tween/easing library | `gene.y = gene.baseY + Math.sin(gene.floatPhase) * amplitude` | One line, no dependencies |

**Key insight:** All Phase 5 features are achievable with Math.sin, ctx.globalAlpha, localStorage, and array.filter. No library adds enough value to justify a dependency in this zero-dependency POC.

## Common Pitfalls

### Pitfall 1: Broken Named Imports from Default Export Config

**What goes wrong:** Files import `{ GRAVITY, GAME_WIDTH }` from `./config.js`, but config uses `export default {}`. All named imports resolve to `undefined` silently.
**Why it happens:** JavaScript destructuring of a default export returns `undefined` for every key. No error is thrown.
**How to avoid:** In Phase 5 code, only use `import CONFIG from './config.js'` and access values as `CONFIG.GRAVITY`, `CONFIG.GAME_WIDTH`. Do NOT use named imports from config.
**Warning signs:** Collectibles spawn at `NaN` coordinates; genes move at `NaN` speed; HUD shows `NaN`.

### Pitfall 2: Float Offset Compounds Each Frame

**What goes wrong:** Gene bounces increasingly far from its spawn Y — appears to drift downward/upward over time.
**Why it happens:** Each frame does `gene.y += Math.sin(phase) * amplitude` instead of computing absolute Y from `baseY`.
**How to avoid:** Always compute `gene.y = gene.baseY + Math.sin(gene.floatPhase) * amplitude`. Never add to `gene.y` directly.
**Warning signs:** Genes drift offscreen after 5-10 seconds.

### Pitfall 3: Speed Ramp Applies During Game Over

**What goes wrong:** Game over screen shows, but `currentSpeed` continues increasing. On restart, the game starts at a very high speed.
**Why it happens:** Speed increment is in the main loop without state guard.
**How to avoid:** Only apply speed increment inside the `gameState === 'RUNNING'` branch. On `reset()`, set `currentSpeed = CONFIG.GAME_SPEED`.
**Warning signs:** Game starts noticeably faster on second run.

### Pitfall 4: localStorage Fails in Incognito Mode

**What goes wrong:** Game crashes or throws uncaught SecurityError when player uses incognito/private browsing.
**Why it happens:** Browsers block localStorage in some private modes, throwing `SecurityError` on `setItem`.
**How to avoid:** Wrap all localStorage calls in try/catch. Use `0` as fallback high score on read failure.
**Warning signs:** Console SecurityError; game becomes unresponsive on first game over.

### Pitfall 5: Gene Collection Feedback Doesn't Fire

**What goes wrong:** Player collects gene (AABB fires), gene disappears, but no popup appears and no flash occurs.
**Why it happens:** `onCollect` callback correctly calls `spawnCollectionPopup` and `triggerGeneNameFlash`, but they mutate arrays/variables that are then overwritten or not read by the render pass.
**How to avoid:** Ensure popups array and geneFlashName are in the same scope as both the update and render functions. If using closures or separate modules, verify the reference chain.
**Warning signs:** Gene disappears silently; no "+N" text; no flash.

### Pitfall 6: Game Over Fires Immediately After Restart

**What goes wrong:** On GAME_OVER → READY → RUNNING transition, collision is detected on the first frame because old obstacles/genes are not cleared.
**Why it happens:** `reset()` doesn't clear the obstacle and gene arrays.
**How to avoid:** In `reset()`, always set `obstacles = []`, `genes = []`, `popups = []`, `collectedGenes = []`, `geneScore = 0`, `distance = 0`, `gameOverTimer = 0`, `currentSpeed = CONFIG.GAME_SPEED`.
**Warning signs:** Instant death on game restart; second run is much shorter than first.

### Pitfall 7: drawText() options.align Ignored

**What goes wrong:** HUD text renders from center despite passing `align: 'right'`.
**Why it happens:** The existing `renderer.js` `drawText()` function correctly reads `options.align`, but call sites pass `align` without using the function, using raw `ctx.fillText` instead. The HUD position math assumes right-aligned text.
**How to avoid:** Always use `drawText(ctx, text, x, y, { align: 'right' })` for right-aligned HUD text. Verify `renderer.js` `drawText()` reads `options.align` (it does — confirmed in source review).
**Warning signs:** Score text overflows right edge of canvas.

### Pitfall 8: Game Over OMIM Links Are Not Clickable in Canvas

**What goes wrong:** Attempt to add hyperlink functionality to canvas-rendered gene cards fails — canvas has no anchor element support.
**Why it happens:** Canvas is a bitmap drawing surface; text rendered with `fillText` is pixels, not interactive DOM elements.
**How to avoid:** Display OMIM IDs and GeneReviews names as text only (e.g., "OMIM: 173900"). For workshop participants, this is sufficient — clinicians can search directly. Do NOT attempt to overlay HTML anchor elements on the canvas in Phase 5 (Phase 6 could add an HTML info panel below the canvas if needed).
**Warning signs:** N/A — this is a design constraint, not a runtime error.

## Code Examples

### Complete Gene Collectible Update (Safe Float Math)

```javascript
// Source: Verified float approach — MDN Math.sin, standard per-entity phase offset

function updateGenes(deltaTime) {
  const AMP  = CONFIG.COLLECTIBLE_FLOAT_AMPLITUDE; // 8
  const FREQ = CONFIG.COLLECTIBLE_FLOAT_FREQ;      // 2.0

  genes.forEach(gene => {
    // Scroll left at current game speed
    gene.x -= currentSpeed * deltaTime;

    // Advance phase
    gene.floatPhase += FREQ * 2 * Math.PI * deltaTime;

    // Compute Y as absolute from baseY — never accumulate
    gene.y = gene.baseY + Math.sin(gene.floatPhase) * AMP;

    // Mark off-screen genes for removal
    if (gene.x + gene.width < 0) gene.dead = true;
  });

  genes = genes.filter(g => !g.dead);
}
```

### LocalStorage High Score (Safe Pattern)

```javascript
// Source: gamedevjs.com verified localStorage pattern
// Handles SecurityError (private mode) and type coercion (string → int)

const LS_KEY = 'kidneyquest_highscore';

function loadHighScore() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    const parsed = parseInt(raw, 10);
    return isNaN(parsed) ? 0 : parsed;
  } catch (e) {
    return 0;
  }
}

function saveHighScore(score) {
  try {
    const current = loadHighScore();
    if (score > current) {
      localStorage.setItem(LS_KEY, String(score));
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}
```

### Floating "+N" Popup (Fade + Float Pattern)

```javascript
// Source: MDN globalAlpha + standard canvas particle pattern

let popups = [];

function spawnPopup(x, y, text) {
  popups.push({ x, y, text, alpha: 1.0, vy: -60 });
}

function updatePopups(deltaTime) {
  popups.forEach(p => {
    p.y  += p.vy * deltaTime;   // 60 px/s upward
    p.alpha -= 1.2 * deltaTime; // fully faded in 0.83s
  });
  popups = popups.filter(p => p.alpha > 0);
}

function drawPopups(ctx) {
  popups.forEach(p => {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha); // clamp to prevent negative alpha
    ctx.fillStyle   = '#FFD700';
    ctx.font        = 'bold 22px sans-serif';
    ctx.textAlign   = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  });
}
```

### Game State Reset (Complete Checklist)

```javascript
// Source: Phase 3/4 reset pattern — extended for Phase 5 additions

function resetGame() {
  gameState     = 'READY';
  currentSpeed  = CONFIG.GAME_SPEED;
  distance      = 0;
  geneScore     = 0;
  collectedGenes = [];
  obstacles     = [];
  genes         = [];
  popups        = [];
  geneFlashName = null;
  geneFlashTimer = 0;
  gameOverTimer  = 0;
  obstacleSpawnTimer = 0;
  geneSpawnTimer = 0;
  highScore      = loadHighScore(); // re-read in case just set
}
```

### Gene Config Entry (Full Structure for Phase 5)

```javascript
// Source: Medical data verified via OMIM (omim.org) — see Sources section.
// Structure extends existing GENE_TYPES entries with educational fields.

GENE_TYPES: [
  {
    name: 'PKD1',
    color: '#4CAF50',     // Green (existing — keep for visual consistency)
    points: 10,
    diseaseName: 'Autosomal Dominant Polycystic Kidney Disease (ADPKD)',
    description: 'Encodes Polycystin-1, a membrane receptor controlling kidney tubule development. Mutations cause fluid-filled cysts that progressively replace kidney tissue.',
    inheritance: 'Autosomal dominant (50% transmission risk)',
    omimId: '173900',
    omimUrl: 'https://omim.org/entry/173900',
    geneReviewsUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK1246/',
  },
  {
    name: 'COL4A5',
    color: '#2196F3',     // Blue (existing — keep)
    points: 15,
    diseaseName: 'Alport Syndrome (X-linked)',
    description: 'Encodes Collagen IV alpha-5, a key component of the glomerular basement membrane. Mutations cause progressive kidney failure, sensorineural hearing loss, and eye abnormalities.',
    inheritance: 'X-linked (males severely affected; females have variable, typically milder disease)',
    omimId: '301050',
    omimUrl: 'https://omim.org/entry/301050',
    geneReviewsUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK1207/',
  },
  {
    name: 'NPHS1',
    color: '#FF9800',     // Orange (existing — keep)
    points: 20,
    diseaseName: 'Congenital Nephrotic Syndrome (Finnish type)',
    description: 'Encodes Nephrin, the structural protein of the slit diaphragm — the kidney\'s finest filtration barrier. Loss of function causes massive protein leakage from birth.',
    inheritance: 'Autosomal recessive (both copies must be mutated)',
    omimId: '256300',
    omimUrl: 'https://omim.org/entry/256300',
    geneReviewsUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK1484/',
  },
],
```

**Note:** Point values (10, 15, 20) kept from existing config. Color values kept for visual consistency with any existing code referencing them.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| setInterval for spawning | Delta-time accumulator in game loop | Standard practice ~2015 | Spawn timing respects pause and tab-switch; no drift |
| Cookie storage for scores | localStorage | ~2009 (HTML5 spec) | Synchronous, larger quota (5MB vs 4KB cookie), no server round-trip |
| Separate "score" class/module | Score as plain variables in main scope | Current project architectural decision | Simpler, avoids broken named-import class pattern |
| Gene collectibles as class instances (gene.js stub) | Plain objects created by factory function | Phase 5 architectural correction | Avoids broken class-based import pattern; functional style matches Phases 1-4 |
| Canvas hyperlinks on game over | OMIM IDs as copyable text | Never possible in canvas | Canvas is a bitmap surface — no anchor elements; text display is the only option |

**Deprecated/outdated for this project:**
- **Class-based collectible.js, score.js:** These stubs use `import { GENE_TYPES, GAME_WIDTH } from './config.js'` which produces `undefined` because config uses `export default`. Do NOT use or import these files. Implement collectible and score logic as plain functions in main.js.
- **`setInterval` / `setTimeout` for spawning:** Phase 3 research confirmed these are incompatible with pausable game loops. Use delta-time accumulator.

## Open Questions

1. **Interactive gene card expansion on game over screen**
   - What we know: CONTEXT.md specifies "expandable gene detail" with inheritance + OMIM links. The only input trigger is Space/tap (used for restart). Canvas cannot render clickable links.
   - What's unclear: Whether the workshop context requires true interactivity or just displaying all information.
   - Recommendation: Display all information (short description + inheritance + OMIM ID as text) in each gene card by default, without requiring user interaction. This satisfies the educational goal while respecting the canvas-only, single-input constraint. Mark "clickable OMIM links" as Phase 6 scope (could use HTML overlay below canvas).

2. **Spawn rate coordination: gene near obstacle for risk-reward**
   - What we know: CONTEXT.md specifies "some genes spawn near obstacles." This implies spatial coordination between gene and obstacle spawn positions.
   - What's unclear: Whether "near obstacle" means the same Y position (same height as obstacle) or same X column (temporal proximity).
   - Recommendation: Implement temporal proximity first — occasionally spawn a gene within 0.5-1 second after an obstacle spawn, same X start position. True spatial proximity (same column) requires reading obstacle positions at spawn time, which complicates the spawn logic. The temporal approach creates the risk-reward dynamic with less coupling. Add `RISK_SPAWN_PROBABILITY: 0.25` to config (25% chance a gene spawns within 1s of an obstacle).

3. **Game over screen scroll for many genes collected**
   - What we know: Canvas cannot scroll natively. If a player collects 10+ genes, gene cards won't fit in the game over screen.
   - What's unclear: Whether a cap of 5 is sufficient or whether Phase 5 should implement canvas panning.
   - Recommendation: Cap display at 5 most recent genes. Add "...and N more genes collected" text if count exceeds 5. Canvas scrolling is out of scope for Phase 5.

4. **NPHS1 GeneReviews URL accuracy**
   - What we know: The GeneReviews URL for NPHS1 (congenital nephrotic syndrome Finnish type) was not directly verified during research. The URL `https://www.ncbi.nlm.nih.gov/books/NBK1484/` is from training data.
   - What's unclear: Whether this NBK ID is current and resolves correctly.
   - Recommendation: Verify this URL before committing the config. The OMIM ID 256300 is confirmed via omim.org.

## Sources

### Primary (HIGH confidence)
- OMIM entry 173900 (omim.org) — PKD1, inheritance pattern, clinical features, confirmed 2026-02-18
- OMIM entry 256300 (omim.org) — NPHS1/Congenital Nephrotic Syndrome, autosomal recessive, confirmed 2026-02-18
- OMIM entry 301050 (via WebSearch) — COL4A5/Alport Syndrome X-linked, confirmed 2026-02-18
- MDN Web Docs: [globalAlpha property](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalAlpha) — valid range, canvas fade animation pattern
- Phase 4 RESEARCH.md (04-RESEARCH.md in this repo) — plain object array pattern, delta-time accumulator, config import architecture analysis
- Phase 3 RESEARCH.md (03-RESEARCH.md in this repo) — game loop, pause, distance counter patterns

### Secondary (MEDIUM confidence)
- [gamedevjs.com — localStorage for high scores](https://gamedevjs.com/articles/using-local-storage-for-high-scores-and-game-progress/) — verified pattern: setItem/getItem, try/catch, JSON.stringify
- [Godot Forum — difficulty curve systems](https://forum.godotengine.org/t/any-tips-for-difficulty-curve-system-of-an-endless-runner/19973) — linear/logarithmic speed ramp approaches for endless runners
- [GeneReviews ADPKD](https://www.ncbi.nlm.nih.gov/books/NBK1246/) — PKD1/PKD2 clinical details (via WebSearch, NCBI verified)
- [GeneReviews Alport Syndrome](https://www.ncbi.nlm.nih.gov/books/NBK1207/) — COL4A5 clinical details (via WebSearch, NCBI verified)

### Tertiary (LOW confidence)
- Float animation parameters (amplitude: 8px, frequency: 2.0 Hz) — derived from aesthetic judgment; no authoritative source for optimal collectible float feel
- NPHS1 GeneReviews URL (NBK1484) — from training data, unverified; planner should check before committing config
- Gene color choices (keeping existing: green/blue/orange) — aesthetic judgment; multiple sources could support different palettes

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — All native browser APIs, established in Phases 1-4; no new dependencies
- Architecture patterns (collectible, scoring, popups): HIGH — Direct extension of Phase 4 plain-object pattern; confirmed against existing codebase
- Config import architecture (default vs named): HIGH — Verified by reading config.js source; confirmed broken named imports in legacy stubs
- Gene medical data (PKD1, COL4A5, NPHS1): HIGH for inheritance/disease name; MEDIUM for description text (clinically accurate per OMIM but simplified for game context)
- localStorage pattern: HIGH — Verified via gamedevjs.com + MDN; confirmed synchronous, no library needed
- Float animation parameters: LOW — Aesthetic judgment only; verify by feel during implementation
- Speed ramp curve values: MEDIUM — Based on analysis of existing config and difficulty forum research; verify by playtesting

**Research date:** 2026-02-18
**Valid until:** 2027-02-18 (native browser APIs and medical gene data are both extremely stable; re-verify only if Canvas API major changes or gene disease classification updates)

**Critical notes for planner:**
1. Do NOT import or wire up the legacy class-based files (collectible.js, score.js, obstacle.js, game.js, player.js, background.js). All Phase 5 code extends main.js and renderer.js only.
2. Config GENE_TYPES entries need new fields (diseaseName, description, inheritance, omimId, omimUrl, geneReviewsUrl) merged into the existing 3-entry array. Point values and colors should be kept for compatibility with any existing code.
3. The "expandable gene detail" from CONTEXT.md should be implemented as always-visible text (no interaction needed) because Space/tap is reserved for restart.
4. Verify `NPHS1` GeneReviews URL (NBK1484) before committing.
5. Risk-reward gene placement near obstacles is recommended as temporal proximity (gene spawns within 1 second of obstacle) rather than spatial proximity (same Y column), to keep spawn logic simple.
