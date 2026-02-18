# Phase 4: Obstacles + Collision - Research

**Researched:** 2026-02-18
**Domain:** Vanilla JS Canvas obstacle spawning, AABB collision with hitbox shrink, screen shake, game over overlay
**Confidence:** HIGH (core patterns); MEDIUM (specific timing values, near-miss threshold)

## Summary

Phase 4 adds three obstacle types (Kidney Stone, Toxin, Salt Crystal), a spawn timer with progressive type introduction, AABB collision detection with per-type hitbox shrink, a near-miss flash, a death animation with screen shake, and a game over overlay. All of this builds directly on the Phase 1 foundation (main.js, renderer.js, input.js, config.js) — no new dependencies are needed.

The critical implementation insight is that the **current codebase is still at the Phase 1 code level** even though Phase 2 and 3 plans have been created. The live js/main.js uses the Phase 1 two-state machine (READY/RUNNING) and `drawGroundLine`. Phase 4 planning must therefore account for the full incremental state: the Phase 4 plan will likely execute against whichever codebase state the executor finds. Plans should be written to integrate with whatever Phase 2 and 3 deliver, not against the current Phase 1 code.

The standard approach for obstacle management in vanilla JS canvas runners is an array of plain objects updated and drawn each frame, with off-screen items removed via `filter`. Spawning uses a delta-time accumulator against a configurable interval rather than `setTimeout` or `setInterval`. AABB collision is four inequality comparisons; forgiveness is achieved by shrinking each obstacle's collision box by a percentage of its visual size. Screen shake uses `ctx.save()`, `ctx.translate(randomX, randomY)`, draw everything, then `ctx.restore()` — the cleanest approach with no state leakage.

**Primary recommendation:** Implement obstacles as a plain object array in main.js, spawn with a delta-time accumulator, detect collision with shrunk AABB, trigger screen shake via ctx.translate in renderer.js, and draw game over as a semi-transparent overlay with `ctx.fillStyle = 'rgba(0,0,0,0.7)'`.

## Standard Stack

No new dependencies. Phase 4 is fully vanilla JS Canvas API, consistent with Phases 1-3.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| HTML5 Canvas 2D API | Browser native | Drawing obstacles, overlay, screen shake | Already established in project |
| requestAnimationFrame | Browser native | Game loop — obstacle update and draw per frame | Already in use |
| ES Modules | ES2015+ | Code organisation | Already established in project |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | — | — | All Phase 4 features achievable with existing vanilla setup |

**Installation:**
```bash
# No installation needed — all native browser APIs
# Already configured in project
```

## Architecture Patterns

### Recommended File Changes

Phase 4 modifies existing files and adds one new optional module. No new external dependencies.

```
js/
├── config.js     # EXTEND: 3 obstacle types (kidney-stone, toxin, salt-crystal) with
│                 #         hitboxShrink, floatY, spawnWeight; spawn timing constants;
│                 #         screen shake constants; near-miss threshold
├── main.js       # EXTEND: obstacle array, spawnTimer, spawnInterval, spawnElapsed,
│                 #         currentSpeed; spawnObstacle(), updateObstacles(), checkCollision(),
│                 #         triggerDeath(), resetGame() extended; game loop branches for
│                 #         DYING (death animation) and GAME_OVER
├── renderer.js   # EXTEND: drawObstacles(), drawNearMissFlash(), drawGameOverOverlay();
│                 #         applyScreenShake() / clearScreenShake() pair using ctx.save/translate/restore
└── (collision.js already exists but uses old class-based pattern — do NOT use it)
```

**Critical:** The legacy `js/collision.js`, `js/obstacle.js`, `js/game.js` files use a class-based architecture incompatible with the Phase 1 module system. They import `{ GAME_WIDTH }` from config which doesn't exist. Do NOT reference or import these files.

### Pattern 1: Obstacle as Plain Object

**What:** Represent each active obstacle as a plain JavaScript object, not a class.
**When to use:** Every obstacle spawned. The obstacle array is the single source of truth.

```javascript
// Source: MDN Games Techniques + verified against Chrome Dino source pattern
// All spawning and collision code references this shape

function createObstacle(type, config) {
  // type = one entry from CONFIG.OBSTACLE_TYPES
  // x starts just off the right edge of the canvas
  const isFloat = type.placement === 'floating';

  // Visual Y position
  const visualY = isFloat
    ? config.GROUND_Y - type.floatHeight  // above ground, at jump height
    : config.GROUND_Y - type.height;      // sitting on ground

  return {
    type: type.name,           // 'kidney-stone' | 'toxin' | 'salt-crystal'
    x: config.CANVAS_WIDTH + 10,
    y: visualY,
    width: type.width,
    height: type.height,
    color: type.color,
    hitboxShrink: type.hitboxShrink,  // 0.15 = 15% shrink on each side
    dead: false,               // flagged for removal when x + width < 0
  };
}

// Collision (shrunk) bounding box — derived from visual bounds at check time
function getHitbox(obstacle) {
  const sx = obstacle.width * obstacle.hitboxShrink;
  const sy = obstacle.height * obstacle.hitboxShrink;
  return {
    x: obstacle.x + sx,
    y: obstacle.y + sy,
    width: obstacle.width - 2 * sx,
    height: obstacle.height - 2 * sy,
  };
}
```

### Pattern 2: Delta-Time Spawn Accumulator

**What:** Accumulate elapsed time each frame and spawn when the accumulator exceeds the interval. Reset accumulator by subtracting (not setting to zero) to preserve remainder.
**When to use:** All obstacle spawning. Do NOT use `setTimeout` or `setInterval`.

```javascript
// Source: Standard delta-time game pattern — verified consistent with Chrome Dino approach
// (Chrome Dino uses a gap-based trigger; accumulator is equivalent and simpler for our case)

let spawnTimer = 0;      // seconds accumulated since last spawn
let spawnInterval = 2.0; // seconds between spawns (from CONFIG.SPAWN_BASE_INTERVAL)

function updateSpawnTimer(deltaTime, gameElapsed) {
  spawnTimer += deltaTime;

  if (spawnTimer >= spawnInterval) {
    spawnTimer -= spawnInterval; // preserve remainder — don't set to 0

    // Determine which obstacle types are unlocked at current elapsed time
    const availableTypes = CONFIG.OBSTACLE_TYPES.filter(t =>
      gameElapsed >= (t.unlockAfter || 0)
    );

    // Weighted random selection from available types
    spawnObstacle(availableTypes);

    // Vary next interval: base +/- random variation
    spawnInterval = CONFIG.SPAWN_BASE_INTERVAL
      + (Math.random() - 0.5) * 2 * CONFIG.SPAWN_INTERVAL_VARIATION;
  }
}
```

**Why `spawnTimer -= spawnInterval` not `spawnTimer = 0`:** Prevents drift. If a frame takes 0.05s longer than expected, that excess carries forward into the next interval, keeping long-run spawn timing accurate.

### Pattern 3: Weighted Obstacle Type Selection

**What:** Select obstacle type by random weight. Allows types with different frequencies.
**When to use:** Each spawn call.

```javascript
// Source: Standard weighted random — no library needed

function weightedRandom(types) {
  const total = types.reduce((sum, t) => sum + (t.spawnWeight || 1), 0);
  let rand = Math.random() * total;
  for (const type of types) {
    rand -= (type.spawnWeight || 1);
    if (rand <= 0) return type;
  }
  return types[types.length - 1]; // fallback
}
```

### Pattern 4: AABB Collision with Hitbox Shrink

**What:** Check if player and obstacle hitboxes overlap. Use shrunk boxes, not visual bounds.
**When to use:** Every frame during RUNNING state, for each active obstacle.

```javascript
// Source: MDN 2D Collision Detection (developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection)
// This is the authoritative AABB algorithm

function aabbOverlap(a, b) {
  // a and b are { x, y, width, height } objects (hitboxes, not visual bounds)
  return (
    a.x < b.x + b.width  &&  // a's left edge is left of b's right edge
    a.x + a.width > b.x  &&  // a's right edge is right of b's left edge
    a.y < b.y + b.height &&  // a's top edge is above b's bottom edge
    a.y + a.height > b.y     // a's bottom edge is below b's top edge
  );
}

// Player hitbox (apply same shrink logic)
function getPlayerHitbox(player, config) {
  const sx = config.PLAYER_WIDTH * config.PLAYER_HITBOX_SHRINK;
  const sy = config.PLAYER_HEIGHT * config.PLAYER_HITBOX_SHRINK;
  return {
    x: player.x + sx,
    y: player.y + sy,
    width: config.PLAYER_WIDTH - 2 * sx,
    height: config.PLAYER_HEIGHT - 2 * sy,
  };
}

// Collision check in game loop (RUNNING state):
function checkCollisions(player, obstacles, config) {
  const playerBox = getPlayerHitbox(player, config);
  for (const obs of obstacles) {
    const obsBox = getHitbox(obs);
    if (aabbOverlap(playerBox, obsBox)) {
      return obs; // return the obstacle that caused the hit
    }
  }
  return null;
}
```

**Shrink formula:** A `hitboxShrink` of 0.15 means each side of the collision box is inset by 15% of the visual dimension. A 40px tall obstacle gets a collision height of `40 - 2*(40*0.15) = 40 - 12 = 28px`. This is the "forgiving feel" described in INFR-04.

### Pattern 5: Near-Miss Detection

**What:** After checking full collision (and confirming no hit), check if player's visual bounds are very close to an obstacle's visual bounds. If they overlap the visual box but not the hitbox, that counts as a near-miss.
**When to use:** Every frame during RUNNING, after the collision check returns null.

```javascript
// Source: Derived from standard AABB pattern — using visual bounds vs hitbox bounds
// Near-miss = visual bounds overlap but hitbox bounds do NOT overlap

function checkNearMiss(player, obstacles, config) {
  // Player visual bounds (no shrink)
  const playerVisual = {
    x: player.x,
    y: player.y,
    width: config.PLAYER_WIDTH,
    height: config.PLAYER_HEIGHT,
  };

  for (const obs of obstacles) {
    // Obstacle visual bounds (no shrink)
    const obsVisual = { x: obs.x, y: obs.y, width: obs.width, height: obs.height };
    if (aabbOverlap(playerVisual, obsVisual)) {
      // Visual bounds overlap but real collision check already passed — near miss!
      return true;
    }
  }
  return false;
}
```

**Note:** This approach elegantly uses the hitbox shrink gap. Visual bounds overlap = near miss. Hitbox bounds overlap = actual collision. No separate threshold needed.

### Pattern 6: Screen Shake via ctx.translate

**What:** Before drawing anything in the game over / death frame, translate the canvas context by a decaying random offset. Restore after drawing.
**When to use:** Death animation frames only (DYING state, while `deathTimer < CONFIG.DEATH_SHAKE_DURATION`).

```javascript
// Source: Standard canvas translate approach — verified via MDN Canvas API
// ctx.save/translate/restore is the correct pattern; does NOT pollute state across frames.

// In renderer.js:
export function drawWithScreenShake(ctx, config, shakeAmount, drawFn) {
  if (shakeAmount <= 0) {
    drawFn();
    return;
  }
  const dx = (Math.random() * 2 - 1) * shakeAmount;
  const dy = (Math.random() * 2 - 1) * shakeAmount;
  ctx.save();
  ctx.translate(dx, dy);
  drawFn();
  ctx.restore();
}

// In main.js — calculate shakeAmount per frame during DYING:
// shakeAmount decays linearly from CONFIG.SHAKE_AMPLITUDE to 0 over CONFIG.DEATH_SHAKE_DURATION
const shakeProgress = deathTimer / CONFIG.DEATH_SHAKE_DURATION;  // 0.0 to 1.0
const shakeAmount = CONFIG.SHAKE_AMPLITUDE * (1 - shakeProgress); // linear decay
```

**Recommended values (Claude's discretion, within standard game feel range):**
- `SHAKE_AMPLITUDE`: 8 px — noticeable but not disorienting
- `DEATH_SHAKE_DURATION`: 0.4 s — matches the 0.5s death animation window
- Decay: linear from SHAKE_AMPLITUDE to 0 over DEATH_SHAKE_DURATION

### Pattern 7: Player Flash During Death

**What:** Toggle player visibility at a fixed interval during the DYING state (not frame-based — use delta-time accumulator).
**When to use:** DYING state only.

```javascript
// Source: Phase 3 RESEARCH.md pattern (already validated — MDN rAF timestamp warning)
// Flash using time, not frame count — frame-rate independent

// In DYING update:
deathTimer += deltaTime;

// Flash: visible for 0.1s, invisible for 0.1s
const flashVisible = Math.floor(deathTimer / CONFIG.DEATH_FLASH_INTERVAL) % 2 === 0;

// In render: only draw player if flashVisible
if (flashVisible) drawPlayer(ctx, player, CONFIG);
```

**Recommended value:** `DEATH_FLASH_INTERVAL: 0.08` s — fast enough to look urgent, slow enough to be perceptible at 60Hz and 120Hz.

### Pattern 8: Game Over Overlay

**What:** Semi-transparent overlay covering the frozen game state, with score and obstacle type that killed the player.
**When to use:** GAME_OVER state (after DYING state completes and game freezes).

```javascript
// Source: MDN Canvas API - Applying Styles and Colors
// (developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors)

export function drawGameOverOverlay(ctx, config, finalScore, killerObstacleName, gameOverTimer) {
  // Semi-transparent backdrop over the frozen game
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.72)'; // 72% opacity — dark enough to read, game state visible behind
  ctx.fillRect(0, 0, config.CANVAS_WIDTH, config.CANVAS_HEIGHT);
  ctx.restore();

  const cx = config.CANVAS_WIDTH / 2;
  const cy = config.CANVAS_HEIGHT / 2;

  // "Game Over"
  drawText(ctx, 'Game Over', cx, cy - 80, {
    font: 'bold 72px sans-serif',
    color: '#FF4444',
  });

  // Which obstacle ended the run
  if (killerObstacleName) {
    const hitLabel = `Hit a ${killerObstacleName}!`;
    drawText(ctx, hitLabel, cx, cy - 20, {
      font: '28px sans-serif',
      color: '#FFAA44',
    });
  }

  // Score (distance traveled)
  const meters = Math.floor(finalScore / config.PX_PER_METER);
  drawText(ctx, `Distance: ${meters}m`, cx, cy + 30, {
    font: '24px sans-serif',
    color: '#FFFFFF',
  });

  // Pulsing restart prompt (only shown after GAME_OVER_COOLDOWN)
  if (gameOverTimer >= config.GAME_OVER_COOLDOWN) {
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(gameOverTimer * 2.5));
    drawText(ctx, 'Press Space to Play Again', cx, cy + 90, {
      font: '28px sans-serif',
      color: '#FFFFFF',
      alpha: pulse,
    });
  }
}
```

### Pattern 9: State Machine Extension (DYING State)

**What:** Add a DYING state between RUNNING and GAME_OVER to handle the death animation window.
**When to use:** On collision detection — transition RUNNING -> DYING -> GAME_OVER.

```javascript
// Source: Follows Phase 3 five-state pattern (MDN Anatomy of a Video Game)
// Valid states after Phase 4: 'READY' | 'COUNTDOWN' | 'RUNNING' | 'DYING' | 'PAUSED' | 'GAME_OVER'

// New state variables:
let deathTimer = 0;
let killerObstacleName = null; // set on collision, shown on game over overlay

function triggerDeath(obstacle) {
  deathTimer = 0;
  killerObstacleType = obstacle.type;  // store for display
  killerObstacleName = getObstacleDisplayName(obstacle.type, CONFIG); // e.g. "Kidney Stone"
  gameState = 'DYING';
}

function updateDying(deltaTime) {
  deathTimer += deltaTime;
  if (deathTimer >= CONFIG.DEATH_ANIMATION_DURATION) {
    // Transition to frozen GAME_OVER
    gameState = 'GAME_OVER';
    gameOverTimer = 0;
  }
}

// GAME_OVER state (already in Phase 3) stays as freeze + overlay
// handleAction: GAME_OVER + cooldown elapsed -> resetGame() + gameState = 'READY'
```

**Why a separate DYING state:** The death animation (flashing + shake) runs for ~0.5s before the game freezes and shows the overlay. Without a separate state, either the overlay would appear immediately (no visual death moment) or the game logic would have to track "dying-before-game-over" with an extra boolean inside GAME_OVER — which the DYING state handles cleanly.

### Recommended CONFIG Additions

```javascript
// Phase 4 additions to config.js

// ── Obstacle types (Phase 4 replaces Phase 3 placeholder types) ──────────────
// Obstacle placement: 'ground' = sits at GROUND_Y; 'floating' = at jump apex
// hitboxShrink: 0.15 = each side inset by 15% of dimension (uniform, per CONTEXT.md)
// spawnWeight: relative probability (higher = more frequent)
// unlockAfter: seconds of game elapsed before this type can spawn

OBSTACLE_TYPES: [
  {
    name: 'kidney-stone',
    displayName: 'Kidney Stone',
    width: 32,
    height: 42,
    color: '#8B6914',        // earthy brown — Claude's discretion
    hitboxShrink: 0.15,      // per CONTEXT.md: ~15-20%, uniform
    placement: 'ground',
    floatHeight: 0,          // unused for ground obstacles
    spawnWeight: 3,          // most common
    unlockAfter: 0,          // available from start
  },
  {
    name: 'toxin',
    displayName: 'Toxin',
    width: 28,
    height: 36,
    color: '#2E8B3A',        // mid-green — Claude's discretion
    hitboxShrink: 0.15,
    placement: 'ground',
    floatHeight: 0,
    spawnWeight: 2,
    unlockAfter: 10,         // per CONTEXT.md: unlocks ~10s in
  },
  {
    name: 'salt-crystal',
    displayName: 'Salt Crystal',
    width: 24,
    height: 52,              // tall — CONTEXT.md mentions "tall salt crystals"
    color: '#B0C8E0',        // white/light-blue — Claude's discretion
    hitboxShrink: 0.20,      // more forgiving per CONTEXT.md: "tall crystals can be more forgiving"
    placement: 'floating',
    floatHeight: 120,        // px above GROUND_Y — at jump apex height
    spawnWeight: 1,
    unlockAfter: 20,         // per CONTEXT.md: unlocks ~20s in
  },
],

// ── Spawn timing ─────────────────────────────────────────────────────────────
SPAWN_BASE_INTERVAL: 2.0,     // seconds between spawns (Claude's discretion)
SPAWN_INTERVAL_VARIATION: 0.6,// ±0.6s random variation around base (Claude's discretion)
FLOAT_UNLOCK_ELAPSED: 15,     // seconds before floating obstacles can appear (CONTEXT.md ~15-20s)

// ── Cluster spawning ─────────────────────────────────────────────────────────
CLUSTER_PROBABILITY: 0.25,    // 25% chance a spawn is part of a 2-3 cluster (Claude's discretion)
CLUSTER_SIZE_MAX: 3,
CLUSTER_GAP: 180,             // px gap between obstacles in a cluster

// ── Hitbox ───────────────────────────────────────────────────────────────────
PLAYER_HITBOX_SHRINK: 0.15,   // player uses same 15% shrink

// ── Death animation ───────────────────────────────────────────────────────────
DEATH_ANIMATION_DURATION: 0.5,  // seconds of flash + shake (CONTEXT.md: ~0.5s)
DEATH_FLASH_INTERVAL: 0.08,     // seconds per flash on/off toggle
DEATH_SHAKE_DURATION: 0.4,      // seconds of screen shake within death window
SHAKE_AMPLITUDE: 8,             // px — Claude's discretion (range 5-12px is standard)

// ── Near-miss ─────────────────────────────────────────────────────────────────
// (No extra config needed — near-miss uses visual bounds vs hitbox gap naturally)
// Near-miss flash uses player color override for 1-2 frames:
NEAR_MISS_FLASH_COLOR: '#FFFF44',  // yellow flash — distinct from normal color
NEAR_MISS_FLASH_DURATION: 0.15,    // seconds of flash (Claude's discretion)

// ── Game over ─────────────────────────────────────────────────────────────────
GAME_OVER_OVERLAY_ALPHA: 0.72,  // overlay darkness (Claude's discretion: 0.6-0.8)
GAME_OVER_COOLDOWN: 1.5,        // seconds before Space accepted (was 1.0 in Phase 3; 1.5 gives time to read "Hit a X!")
```

### Pattern 10: Obstacle Movement and Off-Screen Removal

**What:** Update all obstacles' x position each frame. Remove obstacles that have fully scrolled off the left edge.
**When to use:** RUNNING state (obstacles freeze during DYING and GAME_OVER).

```javascript
// Source: Standard pattern — consistent with Chrome Dino removal approach
// filter() creates a new array; acceptable performance for <20 active obstacles

function updateObstacles(deltaTime, speed) {
  // Move all obstacles left
  for (const obs of obstacles) {
    obs.x -= speed * deltaTime;
  }

  // Remove off-screen obstacles (left edge past canvas)
  // Use filter — simple and readable for workshop audience
  obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
}
```

**Why not object pooling:** For a simple runner with at most 3-5 obstacles on screen at once, `filter()` creates negligible GC pressure. Object pooling adds complexity that is not workshop-friendly and is premature optimization here. This aligns with the Phase 1 decision: readable code over micro-optimization.

### Anti-Patterns to Avoid

- **Using `setTimeout` or `setInterval` for spawning:** These fire outside the game loop and cannot be paused, reset, or delta-time capped. Always use a delta-time accumulator in the game loop.
- **Setting `spawnTimer = 0` instead of `spawnTimer -= spawnInterval`:** Zeroing the timer loses the frame's leftover time, causing gradual drift in spawn intervals.
- **Object-based class collision.js:** The existing `js/collision.js` imports `{ GAME_WIDTH }` which doesn't exist. Do NOT import or reference it.
- **Checking collision with visual bounds (not hitbox):** Without shrink, near-misses feel like hits. Always use `getHitbox()` for collision, visual bounds only for near-miss detection.
- **Screen shake using `canvas.style.transform`:** CSS transforms on the canvas element affect layout and cause layout recalculation. Use `ctx.translate()` within the draw loop.
- **Forgetting `ctx.save/ctx.restore` around screen shake translate:** Without restore, the translate offset accumulates across frames, causing the entire game to drift off-screen.
- **Updating obstacles during DYING state:** Obstacles should freeze in place during the death animation. Only update obstacles when `gameState === 'RUNNING'`.
- **Immediate game over on collision:** The spec requires a death animation window (~0.5s) before the game over overlay. Transition RUNNING -> DYING -> GAME_OVER, not RUNNING -> GAME_OVER directly.
- **Not resetting `killerObstacleName` on game restart:** `resetGame()` must null out killerObstacleName and clear the obstacles array.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weighted random obstacle selection | Complex probability tables | Simple weighted-sum loop | 10-line function; any more is over-engineering |
| Screen shake | CSS animation, particle system, or canvas shake library | `ctx.save/translate(random)/restore` each frame | Zero dependencies, one function, perfectly controllable decay |
| Object pooling for obstacles | Pool class with free/acquire methods | `Array.filter()` to remove off-screen | <20 obstacles max; filter GC is negligible; workshop-readable |
| Hitbox editor | Visual debug tool | `hitboxShrink` percentage in CONFIG | Config-driven shrink is workshop-tweakable in console: `CONFIG.OBSTACLE_TYPES[0].hitboxShrink = 0.3` |
| Near-miss library | Custom proximity detection | Use the gap between visual and hitbox bounds | The hitbox shrink already defines what "close" means — no separate threshold needed |

**Key insight:** This phase is entirely implementable with the existing vanilla Canvas API and the module architecture already in place. The only new JavaScript concepts introduced are the accumulator spawn timer and `ctx.translate` screen shake — both are 10-line patterns, not library-worthy problems.

## Common Pitfalls

### Pitfall 1: Obstacle Colliding Immediately After Spawn

**What goes wrong:** Obstacle spawns at `x = CANVAS_WIDTH` but player is at `x = 320`. If the canvas width is not wide enough or the player is too far right, the obstacle could overlap the player on frame 1.

**Why it happens:** Obstacles are spawned at `CANVAS_WIDTH + 10` but the spawn check and move happen in the same frame.

**How to avoid:** Spawn obstacles at `CANVAS_WIDTH + type.width + 10` to ensure a full obstacle width of clearance before any collision check.

**Warning signs:** Player dies immediately after spawn, or game over triggers on the same frame as spawn.

### Pitfall 2: Floating Obstacles at Wrong Height

**What goes wrong:** "Floating" obstacles appear at ground level, or so high they're impossible to avoid.

**Why it happens:** `floatHeight` configuration error, or drawing Y calculated from top instead of from `GROUND_Y`.

**How to avoid:** Floating obstacle `y = CONFIG.GROUND_Y - obstacle.height - CONFIG.FLOAT_Y_ABOVE_GROUND`. Verify `FLOAT_Y_ABOVE_GROUND` positions the obstacle at the apex of the player's jump arc. The jump apex can be estimated from the Phase 2 physics: `y_apex = JUMP_VELOCITY^2 / (2 * GRAVITY)` = `(-650)^2 / (2 * 1800)` = `422500 / 3600` ≈ `117px` above ground. So `floatHeight: 120` is approximately at jump apex — correct.

**Warning signs:** Player can always jump over floating obstacles (too low) or can never clear them (too high).

### Pitfall 3: Screen Shake Accumulates Across Frames

**What goes wrong:** The entire canvas progressively drifts off-center over the death animation.

**Why it happens:** `ctx.translate(dx, dy)` called without `ctx.save()` before and `ctx.restore()` after. Each frame adds to the existing transform.

**How to avoid:** Always wrap screen shake in `ctx.save()` + `ctx.restore()`. The pattern is: `ctx.save()` → `ctx.translate(shakeX, shakeY)` → draw all content → `ctx.restore()`.

**Warning signs:** After death, the game over overlay and any subsequent frame renders appear offset.

### Pitfall 4: Game Over Accepts Input During Death Animation

**What goes wrong:** Player holding Space triggers instant restart, skipping the death animation entirely.

**Why it happens:** `handleAction` checks `gameState === 'GAME_OVER'` but the DYING state also exists. If `handleAction` doesn't filter DYING, or if the state transitions too fast, restart can be triggered during the animation.

**How to avoid:** `handleAction` must only accept restart input when `gameState === 'GAME_OVER'` AND `gameOverTimer >= CONFIG.GAME_OVER_COOLDOWN`. The DYING state is completely ignored by `handleAction`.

**Warning signs:** Game restarts on the same frame collision is detected.

### Pitfall 5: Spawning Floating Obstacles Before Ground Obstacles Are Established

**What goes wrong:** Players encounter floating obstacles in the first 10 seconds, before they understand the jump mechanic, causing frustration.

**Why it happens:** `unlockAfter` not checked, or the elapsed time variable is not properly tracked.

**How to avoid:** Filter `CONFIG.OBSTACLE_TYPES` by `t.unlockAfter <= gameElapsed` at spawn time. Track `gameElapsed` (seconds since RUNNING started) separately from `distance` (pixels scrolled) to make the unlock time consistent regardless of speed changes.

**Warning signs:** Salt crystals (floating, unlockAfter: 20) appear in the first seconds.

### Pitfall 6: Near-Miss Flashes on Every Frame Instead of Once

**What goes wrong:** Near-miss color flash persists every frame that the player is "near" an obstacle, causing the player to appear permanently highlighted for multi-second stretches.

**Why it happens:** `nearMissActive` set each frame proximity check triggers, never cleared until obstacle passes.

**How to avoid:** Track `nearMissTimer` in seconds. Set to `CONFIG.NEAR_MISS_FLASH_DURATION` on near-miss detection. Decrement per frame. Only flash when `nearMissTimer > 0`. This gives exactly one brief flash per near-miss event regardless of how long the proximity persists.

**Warning signs:** Player constantly appears yellow when running near obstacles.

### Pitfall 7: Delta-Time Spawn Drift

**What goes wrong:** Spawn intervals slowly drift over time — obstacles appear to bunch up or create long gaps.

**Why it happens:** `spawnTimer = 0` resets the timer, discarding any leftover time from the previous frame. A 16ms leftover each spawn compresses to a 1-second drift after 60 spawns.

**How to avoid:** `spawnTimer -= spawnInterval` preserves the remainder. The next interval starts from the leftover, not from zero.

**Warning signs:** Clusters appear more frequently late in the game than in early runs, or vice versa.

### Pitfall 8: obstacles Array Referenced Before Phase 3 Provides game State

**What goes wrong:** `obstacles` update loop runs in COUNTDOWN or READY states, causing null reference errors.

**Why it happens:** Obstacles initialized as empty array before RUNNING, but `updateObstacles` called unconditionally in the game loop.

**How to avoid:** Only call `spawnObstacle`, `updateObstacles`, and `checkCollisions` when `gameState === 'RUNNING'`. Obstacles must be cleared (set to `[]`) in `resetGame()`.

**Warning signs:** Console errors about undefined obstacle properties when tabbing back during READY state.

## Code Examples

### Complete AABB Collision with Hitbox Shrink

```javascript
// Source: MDN 2D Collision Detection (developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection)
// Adapted for per-type hitboxShrink from CONTEXT.md decisions

function getHitbox(entity, shrinkFraction) {
  // shrinkFraction = 0.15 means each side inset 15% of the visual dimension
  const sx = entity.width * shrinkFraction;
  const sy = entity.height * shrinkFraction;
  return {
    x: entity.x + sx,
    y: entity.y + sy,
    width: entity.width - 2 * sx,
    height: entity.height - 2 * sy,
  };
}

function aabbOverlap(a, b) {
  // a, b: { x, y, width, height }
  return (
    a.x < b.x + b.width  &&
    a.x + a.width > b.x  &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

// In game loop (RUNNING state):
const playerHitbox = getHitbox(player, CONFIG.PLAYER_HITBOX_SHRINK);
let collision = null;
let nearMiss = false;

for (const obs of obstacles) {
  const obsHitbox = getHitbox(obs, obs.hitboxShrink);
  if (aabbOverlap(playerHitbox, obsHitbox)) {
    collision = obs;
    break;
  }
  // Near-miss: visual bounds overlap but hitbox did not
  const obsVisual = { x: obs.x, y: obs.y, width: obs.width, height: obs.height };
  const playerVisual = { x: player.x, y: player.y, width: CONFIG.PLAYER_WIDTH, height: CONFIG.PLAYER_HEIGHT };
  if (aabbOverlap(playerVisual, obsVisual)) {
    nearMiss = true;
  }
}

if (collision) {
  triggerDeath(collision);
} else if (nearMiss && nearMissTimer <= 0) {
  nearMissTimer = CONFIG.NEAR_MISS_FLASH_DURATION;
}
```

### Spawn System with Progressive Type Introduction

```javascript
// Source: Standard delta-time accumulator pattern — verified via multiple runner implementations
// Spawn timer keeps accumulating remainder; no drift over time.

let spawnTimer = 0;
let spawnInterval = CONFIG.SPAWN_BASE_INTERVAL;
let gameElapsed = 0;   // seconds since RUNNING started

function updateSpawning(deltaTime) {
  gameElapsed += deltaTime;
  spawnTimer += deltaTime;

  if (spawnTimer >= spawnInterval) {
    spawnTimer -= spawnInterval;  // preserve remainder — critical for accuracy

    // Filter to unlocked types; ground-only until FLOAT_UNLOCK_ELAPSED
    const now = gameElapsed;
    const availableTypes = CONFIG.OBSTACLE_TYPES.filter(t => {
      if ((t.unlockAfter || 0) > now) return false;
      if (t.placement === 'floating' && now < CONFIG.FLOAT_UNLOCK_ELAPSED) return false;
      return true;
    });

    if (availableTypes.length > 0) {
      const type = weightedRandom(availableTypes);
      spawnOne(type);

      // Cluster: with CLUSTER_PROBABILITY, spawn 1-2 more with a short gap
      if (Math.random() < CONFIG.CLUSTER_PROBABILITY) {
        const clusterSize = 1 + Math.floor(Math.random() * (CONFIG.CLUSTER_SIZE_MAX - 1));
        for (let i = 0; i < clusterSize; i++) {
          const extraType = weightedRandom(availableTypes);
          // Delay cluster members by injecting them directly at offset X positions
          spawnOneAtX(extraType, CONFIG.CANVAS_WIDTH + (i + 1) * CONFIG.CLUSTER_GAP);
        }
      }
    }

    // Vary next interval
    const variation = (Math.random() - 0.5) * 2 * CONFIG.SPAWN_INTERVAL_VARIATION;
    spawnInterval = Math.max(0.8, CONFIG.SPAWN_BASE_INTERVAL + variation);
  }
}

function spawnOne(type) {
  obstacles.push(createObstacle(type, CONFIG));
}

function spawnOneAtX(type, x) {
  const obs = createObstacle(type, CONFIG);
  obs.x = x;
  obstacles.push(obs);
}
```

### Screen Shake with Linear Decay

```javascript
// Source: Standard canvas translate approach — consistent with
// jonny.morrill.me camera shake implementation (linear decay variant)
// and MDN Canvas API transforms.

// In renderer.js:
export function drawWithShake(ctx, config, deathTimer, drawFn) {
  const duration = config.DEATH_SHAKE_DURATION;
  const amplitude = config.SHAKE_AMPLITUDE;

  if (deathTimer >= duration) {
    // No shake — draw normally
    drawFn();
    return;
  }

  const progress = deathTimer / duration;               // 0.0 to 1.0
  const currentAmplitude = amplitude * (1.0 - progress); // linear decay

  const dx = (Math.random() * 2 - 1) * currentAmplitude;
  const dy = (Math.random() * 2 - 1) * currentAmplitude * 0.6; // less vertical than horizontal

  ctx.save();
  ctx.translate(Math.round(dx), Math.round(dy)); // round to prevent sub-pixel blurring
  drawFn();
  ctx.restore();
}

// In main.js game loop (DYING state):
drawWithShake(ctx, CONFIG, deathTimer, () => {
  drawGround(ctx, CONFIG, groundOffset);
  if (flashVisible) drawPlayer(ctx, player, CONFIG);
  drawObstacles(ctx, obstacles);
  drawHUD(ctx, CONFIG, distance);
});
```

### resetGame Full Reset

```javascript
// In main.js — extended from Phase 3 resetGame()
// Phase 4 must clear obstacles and killer info.

function resetGame() {
  // Phase 3 reset:
  distance = 0;
  groundOffset = 0;
  gameElapsed = 0;

  // Phase 4 additions:
  obstacles = [];
  spawnTimer = 0;
  spawnInterval = CONFIG.SPAWN_BASE_INTERVAL;
  killerObstacleName = null;
  deathTimer = 0;
  nearMissTimer = 0;

  // Phase 2 addition (player position reset):
  // player.x = CONFIG.PLAYER_X_DEFAULT;
  // player.y = CONFIG.GROUND_Y - CONFIG.PLAYER_HEIGHT;
  // player.velocityY = 0;
  // player.isGrounded = true;

  gameState = 'READY';
}
```

### Game Over Overlay (Confirmed Pattern)

```javascript
// Source: MDN Canvas API - Applying Styles and Colors
// (developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors)
// fillStyle rgba() is the standard approach for semi-transparent overlays.

export function drawGameOverOverlay(ctx, config, finalScore, killerObstacleName, gameOverTimer) {
  // Darken the frozen game state behind the overlay
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${config.GAME_OVER_OVERLAY_ALPHA})`;
  ctx.fillRect(0, 0, config.CANVAS_WIDTH, config.CANVAS_HEIGHT);
  ctx.restore();

  const cx = config.CANVAS_WIDTH / 2;
  const baseY = config.CANVAS_HEIGHT * 0.40;

  drawText(ctx, 'Game Over', cx, baseY, {
    font: 'bold 72px sans-serif',
    color: '#FF4444',
  });

  if (killerObstacleName) {
    drawText(ctx, `Hit a ${killerObstacleName}!`, cx, baseY + 70, {
      font: '28px sans-serif',
      color: '#FFAA44',
    });
  }

  const meters = Math.floor(finalScore / config.PX_PER_METER);
  drawText(ctx, `Distance: ${meters}m`, cx, baseY + 120, {
    font: '24px sans-serif',
    color: '#FFFFFF',
  });

  if (gameOverTimer >= config.GAME_OVER_COOLDOWN) {
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(gameOverTimer * 2.5));
    drawText(ctx, 'Press Space to Play Again', cx, baseY + 180, {
      font: '28px sans-serif',
      color: '#FFFFFF',
      alpha: pulse,
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `setTimeout`/`setInterval` for spawn timing | Delta-time accumulator in rAF loop | ~2015 (game dev standard) | Pause-safe, frame-rate independent, no timer drift |
| Per-pixel collision (slow) | AABB with hitbox shrink (fast) | Always standard for runners | O(n) checks, <1ms for <20 obstacles |
| Hard hitboxes matching visual size | Shrunk hitbox (15-20%) for forgiveness | Modern game design practice | Near-misses feel exciting not unfair |
| Object pooling for obstacle management | Simple `Array.filter()` removal | For <20 objects: filter is fine | Zero complexity, workshop-readable |
| CSS transitions or canvas.style for shake | `ctx.translate()` within draw loop | Canvas API standard | No layout recalculation, no state leakage |
| Class-based entities (js/obstacle.js) | Plain objects in an array | This project's Phase 1 decision | Consistent with established codebase architecture |

**Deprecated/outdated for this project:**
- **`js/collision.js`** (class-based, imports non-existent `GAME_WIDTH`): Do not import. Implement AABB inline in main.js.
- **`js/obstacle.js`** (class-based, incompatible import): Do not import.
- **`setInterval`/`setTimeout` for spawning:** Cannot be paused, not delta-time safe.

## Open Questions

1. **Exact floating obstacle Y position relative to Phase 2 jump arc**
   - What we know: The jump apex with GRAVITY: 1800, JUMP_VELOCITY: -650 is approximately 117px above GROUND_Y. Float height of 120px targets this apex.
   - What's unclear: Phase 2 may use FALL_GRAVITY_MULT: 1.6 which changes the effective apex height. The actual apex needs to be verified against the Phase 2 implementation once complete.
   - Recommendation: Set `FLOAT_Y_ABOVE_GROUND: 120` in config initially. Add a note to the plan task to test-verify floating obstacle height feels fair, and adjust in config if needed. This is a workshop-tunable value.

2. **Cluster spawning implementation approach**
   - What we know: Clusters of 2-3 obstacles are desired (CONTEXT.md decision). Spacing them with X offsets at spawn time is the simplest approach.
   - What's unclear: Whether cluster obstacles should spawn simultaneously at staggered X positions, or whether a "queue" system is needed for more complex patterns.
   - Recommendation: Simultaneous spawn with staggered X positions (e.g., `CANVAS_WIDTH + 180`, `CANVAS_WIDTH + 360`) is simplest. This moves all cluster members at the same speed, which is correct for a side-scroller.

3. **Phase 3 code state at Phase 4 execution time**
   - What we know: The current codebase is at Phase 1 (STATE.md shows "Phase 1 complete, Phase 2 pending"). Phase 3 plans exist but code is not yet written.
   - What's unclear: Exactly what state variables (player, distance, gameElapsed, etc.) Phase 3 will have introduced by the time Phase 4 executes.
   - Recommendation: Phase 4 plan tasks must start by reading the current main.js, renderer.js, config.js, and input.js to understand what Phase 2 and 3 actually built, then integrate. Plans should be written with "assuming Phase 2/3 have added..." language and explicit "read the file first" steps.

## Sources

### Primary (HIGH confidence)
- [MDN 2D Collision Detection](https://developer.mozilla.org/en-US/docs/Games/Techniques/2D_collision_detection) — AABB algorithm, the four comparison conditions, hitbox shrink approach
- [MDN Canvas Applying Styles and Colors](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Applying_styles_and_colors) — `fillStyle = 'rgba(...)'` for semi-transparent overlays
- [MDN Canvas translate](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/translate) — `ctx.translate()` and `ctx.save/restore` for screen shake
- [Chrome Dino Game Source via codepel.com](https://codepel.com/html5-games/chrome-dino-game-code/) — Demand-based obstacle spawning, obstacle array with removal, AABB with gap check

### Secondary (MEDIUM confidence)
- [Jonny Morrill Camera Shake](https://jonny.morrill.me/en/blog/gamedev-how-to-implement-a-camera-shake-effect/) — Decay function for screen shake (linear decay variant used here)
- [anpetersen.me Screen Shake](https://anpetersen.me/2015/01/16/for-the-sake-of-screen-shake.html) — Physics-based shake with damper; confirmed random-acceleration approach
- [W3Schools Game Obstacles Tutorial](https://www.w3schools.com/graphics/game_obstacles.asp) — Frame-based spawn interval pattern (adapted to delta-time for this project)
- Phase 3 RESEARCH.md (internal) — DYING state flash pattern, delta-time safe flash interval technique

### Tertiary (LOW confidence)
- Specific timing values (SPAWN_BASE_INTERVAL: 2.0s, SHAKE_AMPLITUDE: 8px, CLUSTER_PROBABILITY: 25%) — These are Claude's discretion per CONTEXT.md, within ranges confirmed as "standard game feel" by multiple sources but not empirically verified for this specific game. All values are in CONFIG for workshop tuning.
- Cluster spawning with simultaneous X-staggered spawn — Simple implementation, common pattern, but not verified against a specific authoritative source for this exact mechanic.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — No new dependencies; all native Canvas API already in use
- AABB algorithm: HIGH — Verified via MDN official documentation (authoritative source)
- Hitbox shrink approach: HIGH — Pattern documented in MDN; specific percentage (15-20%) is CONTEXT.md decision
- Screen shake (ctx.translate): HIGH — Standard Canvas API pattern; verified via MDN and multiple sources
- Spawn accumulator pattern: HIGH — Standard game loop pattern, consistent with Chrome Dino source approach
- Specific timing values (intervals, amplitudes): MEDIUM — Claude's discretion per CONTEXT.md; workshop-tweakable via CONFIG
- Floating obstacle height calculation: MEDIUM — Physics math is solid but depends on Phase 2 implementation details
- Near-miss implementation: HIGH — Elegant use of existing hitbox shrink gap; no extra threshold needed

**Research date:** 2026-02-18
**Valid until:** 2027-02-18 (1 year — native browser APIs extremely stable; game design patterns are timeless)

**Critical notes for planner:**
- The current codebase is Phase 1 only (main.js shows `drawGroundLine`, two-state machine). Phase 4 tasks must read actual files before modifying, not assume Phase 2/3 state.
- The existing `js/collision.js`, `js/obstacle.js`, `js/game.js` files are INCOMPATIBLE with this codebase. Never import them.
- DYING is a new state between RUNNING and GAME_OVER — Phase 3's GAME_OVER handling may need adjustment if Phase 3 makes GAME_OVER do the flash animation directly.
- `killerObstacleName` (display name like "Kidney Stone") must be derived from the obstacle type's `displayName` config field, not stored on the obstacle object itself.
- All timing values (spawn intervals, shake amplitude, cluster probability) are Claude's discretion per CONTEXT.md and must be in CONFIG for live workshop tweaking.
