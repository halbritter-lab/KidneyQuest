// main.js -- KidneyQuest module entry point
// Wires config, input, renderer, and player physics into a working game loop.

import CONFIG from './config.js';
import {
  setupCanvas, resizeCanvas, clearCanvas, drawText,
  drawGround, drawPlayer, drawObstacles,
  drawCountdown, drawPauseOverlay, drawGameOver, drawHUD,
  drawWithShake,
} from './renderer.js';
import { setupInput } from './input.js';
import { createPlayer, updatePlayer, handleJumpPress, handleJumpRelease } from './player.js';

// Expose CONFIG globally so workshop participants can inspect and mutate values
// in the browser console, e.g. CONFIG.GRAVITY = 2200
window.CONFIG = CONFIG;
console.log('KidneyQuest v1.0 -- CONFIG available in console');

// ---------------------------------------------------------------------------
// Canvas initialisation
// ---------------------------------------------------------------------------

const canvas = document.getElementById('game-canvas');
const { ctx } = setupCanvas(canvas, CONFIG);

// Set initial CSS size and keep it in sync with viewport changes
resizeCanvas(canvas, CONFIG);
window.addEventListener('resize', () => resizeCanvas(canvas, CONFIG));

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------

const player = createPlayer(CONFIG);

// ---------------------------------------------------------------------------
// Game state -- five-state machine
//
//   READY      : start screen shown, waiting for first Space press
//   COUNTDOWN  : 3-2-1-Go! countdown before game begins
//   RUNNING    : game active, player physics and distance tracking running
//   PAUSED     : game frozen (Escape / P toggles in/out)
//   GAME_OVER  : end screen with flash, then Space to restart
// ---------------------------------------------------------------------------

let gameState = 'READY';

// Countdown sub-state
let countdownValue = 3;
let countdownTimer = 0;

// Game over sub-state
let gameOverTimer = 0;

// Distance tracking (in pixels; displayed as meters via PX_PER_METER)
let distance = 0;

// Cumulative ground scroll distance in pixels.
// Increments at READY_SCROLL_SPEED on the start screen, at GAME_SPEED while running.
let groundOffset = 0;

// Obstacle state (Phase 4)
let obstacles = [];
let spawnTimer = 0;
let spawnInterval = CONFIG.SPAWN_BASE_INTERVAL;
let gameElapsed = 0;  // seconds since RUNNING started (for progressive unlocking)

// Collision and death state (Phase 4 Plan 02)
let deathTimer = 0;
let killerObstacleName = null;
let nearMissTimer = 0;

// ---------------------------------------------------------------------------
// State transition helpers
// ---------------------------------------------------------------------------

function startCountdown() {
  countdownValue = 3;
  countdownTimer = 0;
  gameState = 'COUNTDOWN';
}

function triggerGameOver() {
  gameOverTimer = 0;
  gameState = 'GAME_OVER';
}
// Expose for testing via browser console
window.triggerGameOver = triggerGameOver;

function togglePause() {
  if (gameState === 'RUNNING') {
    gameState = 'PAUSED';
    lastTime = 0; // CRITICAL: prevents huge delta on resume
  } else if (gameState === 'PAUSED') {
    gameState = 'RUNNING';
    lastTime = 0; // CRITICAL: prevents huge delta on resume
  }
}

function resetGame() {
  distance = 0;
  groundOffset = 0;
  Object.assign(player, createPlayer(CONFIG));
  obstacles = [];
  spawnTimer = 0;
  spawnInterval = CONFIG.SPAWN_BASE_INTERVAL;
  gameElapsed = 0;
  deathTimer = 0;
  killerObstacleName = null;
  nearMissTimer = 0;
  gameState = 'READY';
}

// ---------------------------------------------------------------------------
// Input -- action callbacks
// ---------------------------------------------------------------------------

function handleAction() {
  if (gameState === 'READY') {
    startCountdown(); // transition through countdown, NOT directly to RUNNING
  } else if (gameState === 'RUNNING') {
    handleJumpPress(player);
  } else if (gameState === 'GAME_OVER') {
    // Only accept restart after freeze delay + cooldown have elapsed
    if (gameOverTimer >= CONFIG.GAME_OVER_FREEZE_DELAY + CONFIG.GAME_OVER_COOLDOWN) {
      resetGame();
    }
  }
  // COUNTDOWN, PAUSED, and DYING: ignore Space
}

function handleActionRelease() {
  if (gameState === 'RUNNING') {
    handleJumpRelease(player);
  }
}

function handlePause() {
  if (gameState === 'RUNNING' || gameState === 'PAUSED') {
    togglePause();
  }
}

setupInput(canvas, handleAction, handleActionRelease, handlePause);

// ---------------------------------------------------------------------------
// Horizontal movement -- ArrowLeft / ArrowRight
// Mobile gets jump via tap only (CONTEXT.md decision); no on-screen D-pad in Phase 2.
// ---------------------------------------------------------------------------

/**
 * Adds ArrowLeft and ArrowRight keydown/keyup listeners to set player.velocityX.
 * Keeps input.js focused on the action callback pattern.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} player
 * @param {Object} config
 */
function setupMovement(canvas, player, config) {
  canvas.addEventListener('keydown', (e) => {
    if (e.code === 'ArrowLeft') {
      e.preventDefault();
      player.velocityX = -config.PLAYER_MOVE_SPEED;
    } else if (e.code === 'ArrowRight') {
      e.preventDefault();
      player.velocityX = config.PLAYER_MOVE_SPEED;
    }
  });

  canvas.addEventListener('keyup', (e) => {
    if (e.code === 'ArrowLeft') {
      // Only stop if currently moving left (avoid cancelling a right-movement keyup)
      if (player.velocityX < 0) player.velocityX = 0;
    } else if (e.code === 'ArrowRight') {
      // Only stop if currently moving right
      if (player.velocityX > 0) player.velocityX = 0;
    }
  });
}

setupMovement(canvas, player, CONFIG);

// ---------------------------------------------------------------------------
// Start screen renderer
// ---------------------------------------------------------------------------

/**
 * Draws the animated start screen on top of the already-cleared canvas.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} timestamp - DOMHighResTimeStamp from requestAnimationFrame
 */
function renderStartScreen(ctx, timestamp) {
  const cx = CONFIG.CANVAS_WIDTH / 2;

  // "KidneyQuest" title -- large, opaque, positioned at ~35% from top
  drawText(ctx, 'KidneyQuest', cx, CONFIG.CANVAS_HEIGHT * 0.35, {
    font: 'bold 64px sans-serif',
    color: CONFIG.TEXT_COLOR,
  });

  // "Press Space to Start" prompt -- smaller, pulsing alpha
  // Oscillates smoothly between 0.3 and 1.0 at ~2 cycles per second
  const alpha = 0.3 + 0.7 * Math.abs(Math.sin(timestamp / 500));
  drawText(ctx, 'Press Space to Start', cx, CONFIG.CANVAS_HEIGHT * 0.55, {
    font: '28px sans-serif',
    color: CONFIG.TEXT_COLOR,
    alpha,
  });
}

// ---------------------------------------------------------------------------
// Obstacle helpers (Phase 4)
// ---------------------------------------------------------------------------

/**
 * Weighted random selection from an array of obstacle type objects.
 * Each type uses its `spawnWeight` property (defaults to 1 if missing).
 *
 * @param {Array} types - Array of obstacle type objects with spawnWeight
 * @returns {Object} A randomly selected type object
 */
function weightedRandom(types) {
  const total = types.reduce((sum, t) => sum + (t.spawnWeight || 1), 0);
  let rand = Math.random() * total;
  for (const type of types) {
    rand -= (type.spawnWeight || 1);
    if (rand <= 0) return type;
  }
  return types[types.length - 1];
}

/**
 * Creates an obstacle state object for a given type.
 * Default spawn X is just off the right edge of the canvas.
 * xOverride is used for cluster members at staggered positions.
 *
 * @param {Object} type - Obstacle type definition from CONFIG.OBSTACLE_TYPES
 * @param {number} [xOverride] - Optional X position override for cluster members
 * @returns {Object} Obstacle state object
 */
function createObstacle(type, xOverride) {
  const isFloat = type.placement === 'floating';
  const visualY = isFloat
    ? CONFIG.GROUND_Y - type.height - type.floatHeight
    : CONFIG.GROUND_Y - type.height;

  return {
    type: type.name,
    displayName: type.displayName,
    x: xOverride !== undefined ? xOverride : CONFIG.CANVAS_WIDTH + type.width + 10,
    y: visualY,
    width: type.width,
    height: type.height,
    color: type.color,
    hitboxShrink: type.hitboxShrink,
  };
}

/**
 * Advances the spawn timer with delta-time accumulation.
 * Applies progressive type unlocking: ground types first, then floating after FLOAT_UNLOCK_ELAPSED.
 * Cluster spawning: CLUSTER_PROBABILITY chance of 1-2 additional staggered obstacles per spawn.
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updateSpawning(deltaTime) {
  gameElapsed += deltaTime;
  spawnTimer += deltaTime;

  if (spawnTimer >= spawnInterval) {
    spawnTimer -= spawnInterval;  // preserve remainder -- critical for accuracy

    // Filter to unlocked types; ground-only until FLOAT_UNLOCK_ELAPSED
    const availableTypes = CONFIG.OBSTACLE_TYPES.filter(t => {
      if ((t.unlockAfter || 0) > gameElapsed) return false;
      if (t.placement === 'floating' && gameElapsed < CONFIG.FLOAT_UNLOCK_ELAPSED) return false;
      return true;
    });

    if (availableTypes.length > 0) {
      const type = weightedRandom(availableTypes);
      obstacles.push(createObstacle(type));

      // Cluster: with CLUSTER_PROBABILITY, spawn 1-2 more at staggered X positions
      if (Math.random() < CONFIG.CLUSTER_PROBABILITY) {
        const clusterSize = 1 + Math.floor(Math.random() * (CONFIG.CLUSTER_SIZE_MAX - 1));
        for (let i = 0; i < clusterSize; i++) {
          const extraType = weightedRandom(availableTypes);
          const clusterX = CONFIG.CANVAS_WIDTH + (i + 1) * CONFIG.CLUSTER_GAP + extraType.width + 10;
          obstacles.push(createObstacle(extraType, clusterX));
        }
      }
    }

    // Vary next spawn interval to avoid metronome-regular spacing
    const variation = (Math.random() - 0.5) * 2 * CONFIG.SPAWN_INTERVAL_VARIATION;
    spawnInterval = Math.max(0.8, CONFIG.SPAWN_BASE_INTERVAL + variation);
  }
}

/**
 * Moves all obstacles left at GAME_SPEED and removes any that have scrolled off-screen.
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updateObstacles(deltaTime) {
  const speed = CONFIG.GAME_SPEED;
  for (const obs of obstacles) {
    obs.x -= speed * deltaTime;
  }
  obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
}

// ---------------------------------------------------------------------------
// Collision detection helpers (Phase 4 Plan 02)
// ---------------------------------------------------------------------------

/**
 * Returns a shrunk bounding box for an entity by reducing each side by
 * shrinkFraction * dimension. Shrinking by 0.15 removes 30% total from
 * each axis, making near-misses feel exciting rather than unfair.
 *
 * @param {Object} entity - Object with x, y, width, height
 * @param {number} shrinkFraction - Fraction of dimension to remove per side
 * @returns {{ x, y, width, height }} Shrunk hitbox
 */
function getHitbox(entity, shrinkFraction) {
  const sx = entity.width * shrinkFraction;
  const sy = entity.height * shrinkFraction;
  return {
    x: entity.x + sx,
    y: entity.y + sy,
    width: entity.width - 2 * sx,
    height: entity.height - 2 * sy,
  };
}

/**
 * Standard axis-aligned bounding box overlap test.
 * Returns true if rectangle a and rectangle b overlap.
 *
 * @param {{ x, y, width, height }} a
 * @param {{ x, y, width, height }} b
 * @returns {boolean}
 */
function aabbOverlap(a, b) {
  return (
    a.x < b.x + b.width &&
    a.x + a.width > b.x &&
    a.y < b.y + b.height &&
    a.y + a.height > b.y
  );
}

/**
 * Checks all active obstacles for collision with the player (using shrunk hitboxes)
 * and also for near-miss (visual bounds overlap but hitboxes did not).
 *
 * @param {Object} player - Player state object with x, y
 * @returns {{ collision: Object|null, nearMiss: boolean }}
 */
function checkCollisions(player) {
  const playerHitbox = getHitbox(
    { x: player.x, y: player.y, width: CONFIG.PLAYER_WIDTH, height: CONFIG.PLAYER_HEIGHT },
    CONFIG.PLAYER_HITBOX_SHRINK
  );

  for (const obs of obstacles) {
    const obsHitbox = getHitbox(obs, obs.hitboxShrink);
    if (aabbOverlap(playerHitbox, obsHitbox)) {
      return { collision: obs, nearMiss: false };
    }
  }

  // No collision -- check for near-miss (visual bounds overlap but hitbox didn't)
  const playerVisual = { x: player.x, y: player.y, width: CONFIG.PLAYER_WIDTH, height: CONFIG.PLAYER_HEIGHT };
  for (const obs of obstacles) {
    const obsVisual = { x: obs.x, y: obs.y, width: obs.width, height: obs.height };
    if (aabbOverlap(playerVisual, obsVisual)) {
      return { collision: null, nearMiss: true };
    }
  }

  return { collision: null, nearMiss: false };
}

/**
 * Transitions the game from RUNNING into the DYING state.
 * Records which obstacle killed the player and resets the death animation timer.
 *
 * @param {Object} obstacle - The obstacle that caused the collision
 */
function triggerDeath(obstacle) {
  deathTimer = 0;
  killerObstacleName = obstacle.displayName;
  gameState = 'DYING';
}

// ---------------------------------------------------------------------------
// Per-state update helpers
// ---------------------------------------------------------------------------

/**
 * Advances the countdown timer; transitions to RUNNING when countdown expires.
 * Uses delta-time accumulator (no setTimeout).
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updateCountdown(deltaTime) {
  countdownTimer += deltaTime;
  if (countdownTimer >= CONFIG.COUNTDOWN_STEP) {
    countdownValue -= 1;
    countdownTimer -= CONFIG.COUNTDOWN_STEP; // carry-over for accuracy
    if (countdownValue < 0) {
      // Countdown finished: start the game
      gameState = 'RUNNING';
      distance = 0;
    }
  }
}

/**
 * Accumulates game-over elapsed time (used for flash and cooldown logic).
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updateGameOver(deltaTime) {
  gameOverTimer += deltaTime;
}

/**
 * Advances the distance counter while RUNNING.
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updateDistance(deltaTime) {
  distance += CONFIG.GAME_SPEED * deltaTime;
}

// ---------------------------------------------------------------------------
// Game loop
// ---------------------------------------------------------------------------

let lastTime = 0;

function gameLoop(timestamp) {
  // Delta time in seconds, capped at 0.1s to prevent huge physics jumps on
  // tab switch, browser throttling, or first frame after pause resume
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  clearCanvas(ctx, CONFIG);

  // Update ground scroll based on state
  // PAUSED and GAME_OVER: groundOffset unchanged (ground freezes)
  if (gameState === 'READY' || gameState === 'COUNTDOWN') {
    groundOffset += CONFIG.READY_SCROLL_SPEED * deltaTime;
  } else if (gameState === 'RUNNING') {
    groundOffset += CONFIG.GAME_SPEED * deltaTime;
  }

  // Scrolling ground is always visible regardless of state
  // DYING state draws ground inside drawWithShake to apply screen shake
  if (gameState !== 'DYING') {
    drawGround(ctx, CONFIG, groundOffset);
  }

  // State-specific update and render
  if (gameState === 'READY') {
    renderStartScreen(ctx, timestamp);

  } else if (gameState === 'COUNTDOWN') {
    updateCountdown(deltaTime);
    drawCountdown(ctx, CONFIG, countdownValue, countdownTimer);
    // Draw player in idle position during countdown (physics still ticks)
    updatePlayer(player, deltaTime);
    drawPlayer(ctx, player, CONFIG);

  } else if (gameState === 'RUNNING') {
    updateDistance(deltaTime);
    updateSpawning(deltaTime);
    updateObstacles(deltaTime);
    updatePlayer(player, deltaTime);

    // Advance near-miss flash timer
    if (nearMissTimer > 0) nearMissTimer -= deltaTime;

    // Collision and near-miss detection
    const collisionResult = checkCollisions(player);
    if (collisionResult.collision) {
      triggerDeath(collisionResult.collision);
      // Skip rest of RUNNING rendering -- DYING state handles the next frame
    } else {
      if (collisionResult.nearMiss && nearMissTimer <= 0) {
        nearMissTimer = CONFIG.NEAR_MISS_FLASH_DURATION;
      }

      drawObstacles(ctx, obstacles);
      drawPlayer(ctx, player, CONFIG);

      // Near-miss yellow flash overlay on the player
      if (nearMissTimer > 0) {
        ctx.save();
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = CONFIG.NEAR_MISS_FLASH_COLOR;
        ctx.fillRect(
          Math.round(player.x),
          Math.round(player.y),
          CONFIG.PLAYER_WIDTH,
          CONFIG.PLAYER_HEIGHT
        );
        ctx.restore();
      }

      drawHUD(ctx, CONFIG, distance);
    }

  } else if (gameState === 'DYING') {
    deathTimer += deltaTime;

    if (deathTimer >= CONFIG.DEATH_ANIMATION_DURATION) {
      gameState = 'GAME_OVER';
      gameOverTimer = 0;
    }

    // Render all game content with screen shake; player flashes on/off
    drawWithShake(ctx, CONFIG, deathTimer, () => {
      drawGround(ctx, CONFIG, groundOffset);
      drawObstacles(ctx, obstacles);

      // Player flash: visible every other DEATH_FLASH_INTERVAL
      const flashVisible = Math.floor(deathTimer / CONFIG.DEATH_FLASH_INTERVAL) % 2 === 0;
      if (flashVisible) {
        drawPlayer(ctx, player, CONFIG);
      }

      drawHUD(ctx, CONFIG, distance);
    });

  } else if (gameState === 'PAUSED') {
    drawObstacles(ctx, obstacles);   // frozen in place (no update)
    drawPlayer(ctx, player, CONFIG); // frozen position (no updatePlayer call)
    drawHUD(ctx, CONFIG, distance);
    drawPauseOverlay(ctx, CONFIG);

  } else if (gameState === 'GAME_OVER') {
    updateGameOver(deltaTime);
    drawObstacles(ctx, obstacles);   // frozen in place (no update)
    // Flash player during freeze delay, then show steadily
    if (gameOverTimer < CONFIG.GAME_OVER_FREEZE_DELAY) {
      const flashVisible = Math.floor(gameOverTimer / CONFIG.FLASH_INTERVAL) % 2 === 0;
      if (flashVisible) drawPlayer(ctx, player, CONFIG);
    } else {
      drawPlayer(ctx, player, CONFIG);
    }
    drawHUD(ctx, CONFIG, distance);
    drawGameOver(ctx, CONFIG, gameOverTimer, killerObstacleName, distance);
  }

  requestAnimationFrame(gameLoop);
}

// Expose game state for testing and workshop debugging
window.__game = {
  get state()               { return gameState; },
  get distance()            { return distance; },
  get countdownValue()      { return countdownValue; },
  get countdownTimer()      { return countdownTimer; },
  get gameOverTimer()       { return gameOverTimer; },
  get groundOffset()        { return groundOffset; },
  get player()              { return player; },
  get obstacles()           { return obstacles; },
  get gameElapsed()         { return gameElapsed; },
  get spawnTimer()          { return spawnTimer; },
  get deathTimer()          { return deathTimer; },
  get killerObstacleName()  { return killerObstacleName; },
  get nearMissTimer()       { return nearMissTimer; },
};

// Kick off the loop -- runs continuously even on the start screen for the
// pulsing animation
requestAnimationFrame(gameLoop);
