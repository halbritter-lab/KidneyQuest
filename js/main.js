// main.js -- KidneyQuest module entry point
// Wires config, input, renderer, and player physics into a working game loop.

import CONFIG from './config.js';
import {
  setupCanvas, resizeCanvas, clearCanvas, drawText,
  drawGround, drawPlayer, drawObstacles, drawGenes,
  drawCountdown, drawPauseOverlay, drawGameOver, drawHUD,
  drawWithShake, drawPopups, drawGeneFlash, drawGameOverScreen,
  drawStompRings,
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

// Gene collectible state (Phase 5)
let genes = [];
let geneSpawnTimer = 0;

// Score state (Phase 5)
let geneScore = 0;
let collectedGenes = [];   // array of typeData objects for game over education screen

// Difficulty ramp (Phase 5)
let currentSpeed = CONFIG.GAME_SPEED;

// Floating popup particles (Phase 5)
let popups = [];

// Stomp ring effects (Phase 6)
let stompRings = [];

// Gene name flash (Phase 5)
let geneFlashName = null;
let geneFlashTimer = 0;

// High score (Phase 5)
let highScore = 0;

// ---------------------------------------------------------------------------
// localStorage high score persistence (Phase 5)
// ---------------------------------------------------------------------------

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

// Initialise high score from localStorage on load
highScore = loadHighScore();

// ---------------------------------------------------------------------------
// Score helper (Phase 5)
// ---------------------------------------------------------------------------

function getTotalScore() {
  return geneScore + Math.floor(distance / CONFIG.PX_PER_METER);
}

// ---------------------------------------------------------------------------
// State transition helpers
// ---------------------------------------------------------------------------

function startCountdown() {
  countdownValue = 3;
  countdownTimer = 0;
  gameState = 'COUNTDOWN';
}

function triggerGameOver() {
  const isNewRecord = saveHighScore(getTotalScore());
  highScore = loadHighScore();
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
  genes = [];
  geneSpawnTimer = 0;
  geneScore = 0;
  collectedGenes = [];
  currentSpeed = CONFIG.GAME_SPEED;
  popups = [];
  stompRings = [];
  geneFlashName = null;
  geneFlashTimer = 0;
  highScore = loadHighScore();
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
    // Only accept restart after cooldown has elapsed
    if (gameOverTimer >= CONFIG.RESTART_COOLDOWN) {
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
    hp: type.hp || 1,
    placement: type.placement || 'ground',
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
      // Dynamic gap: widens at higher speeds so players have reaction time
      const dynamicGap = Math.max(CONFIG.CLUSTER_GAP, CONFIG.CLUSTER_GAP_MIN_TIME * currentSpeed);

      if (Math.random() < CONFIG.CLUSTER_PROBABILITY) {
        // Force all cluster members to match lead obstacle's placement type
        const leadPlacement = type.placement || 'ground';
        const clusterTypes = availableTypes.filter(t => (t.placement || 'ground') === leadPlacement);
        const clusterPool = clusterTypes.length > 0 ? clusterTypes : [type];

        const clusterSize = 1 + Math.floor(Math.random() * (CONFIG.CLUSTER_SIZE_MAX - 1));
        for (let i = 0; i < clusterSize; i++) {
          const extraType = weightedRandom(clusterPool);
          const clusterX = CONFIG.CANVAS_WIDTH + (i + 1) * dynamicGap + extraType.width + 10;
          obstacles.push(createObstacle(extraType, clusterX));
        }
      }
    }

    // Post-spawn filter: remove any floating obstacle too close to a ground obstacle
    // Catches edge cases across separate spawn events
    const safeDistance = CONFIG.CLUSTER_GAP_MIN_TIME * currentSpeed;
    obstacles = obstacles.filter(obs => {
      if (obs.placement !== 'floating') return true;
      for (const other of obstacles) {
        if (other === obs || other.placement !== 'ground') continue;
        if (Math.abs(obs.x - other.x) < safeDistance) return false;
      }
      return true;
    });

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
  for (const obs of obstacles) {
    obs.x -= currentSpeed * deltaTime;
  }
  obstacles = obstacles.filter(obs => obs.x + obs.width > 0);
}

// ---------------------------------------------------------------------------
// Gene collectible helpers (Phase 5)
// ---------------------------------------------------------------------------

/**
 * Creates a gene collectible state object for the given gene type definition.
 * Spawn Y is randomised within the vertical zone between the player zone and ground.
 *
 * @param {Object} type - Gene type definition from CONFIG.GENE_TYPES
 * @returns {Object} Gene state object
 */
function createGene(type) {
  const spawnY = 300 + Math.random() * 200;
  return {
    type: type.name,
    typeData: type,
    x: CONFIG.CANVAS_WIDTH + 20,
    y: spawnY,
    baseY: spawnY,
    width: type.width,
    height: type.height,
    color: type.color,
    points: type.points,
    floatPhase: Math.random() * Math.PI * 2,
    dead: false,
  };
}

/**
 * Moves all active genes left at currentSpeed and applies per-gene floating
 * sine animation. Uses absolute baseY + sin offset to avoid drift.
 * Marks genes as dead when they scroll off-screen.
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updateGenes(deltaTime) {
  const AMP = CONFIG.COLLECTIBLE_FLOAT_AMPLITUDE;
  const FREQ = CONFIG.COLLECTIBLE_FLOAT_FREQ;

  for (const gene of genes) {
    gene.x -= currentSpeed * deltaTime;
    gene.floatPhase += FREQ * 2 * Math.PI * deltaTime;
    gene.y = gene.baseY + Math.sin(gene.floatPhase) * AMP;
    if (gene.x + gene.width < 0) gene.dead = true;
  }
  genes = genes.filter(g => !g.dead);
}

/**
 * Delta-time accumulator for gene spawning.
 * Spawn interval shortens gradually as currentSpeed increases (more genes at higher speeds).
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updateGeneSpawning(deltaTime) {
  geneSpawnTimer += deltaTime;

  const speedRatio = currentSpeed / CONFIG.GAME_SPEED;
  const baseInterval = CONFIG.COLLECTIBLE_SPAWN_BASE_INTERVAL / Math.max(1, speedRatio * 0.5 + 0.5);
  const variation = (Math.random() - 0.5) * 2 * CONFIG.COLLECTIBLE_SPAWN_VARIATION;
  const interval = Math.max(1.5, baseInterval + variation);

  if (geneSpawnTimer >= interval) {
    geneSpawnTimer -= interval;
    const type = CONFIG.GENE_TYPES[Math.floor(Math.random() * CONFIG.GENE_TYPES.length)];
    genes.push(createGene(type));
  }
}

/**
 * AABB collision check between the player and all active genes (no hitbox shrink).
 * Removes collected genes immediately and calls onGeneCollected for each hit.
 *
 * @param {Object} player - Player state object with x, y
 */
function checkGeneCollisions(player) {
  const px = player.x;
  const py = player.y;
  const pw = CONFIG.PLAYER_WIDTH;
  const ph = CONFIG.PLAYER_HEIGHT;

  for (const gene of genes) {
    if (gene.dead) continue;
    if (px < gene.x + gene.width &&
        px + pw > gene.x &&
        py < gene.y + gene.height &&
        py + ph > gene.y) {
      gene.dead = true;
      onGeneCollected(gene);
    }
  }
  genes = genes.filter(g => !g.dead);
}

/**
 * Awards points, records the collected gene type, spawns a floating popup,
 * and triggers the gene name flash effect near the HUD.
 *
 * @param {Object} gene - Collected gene state object
 */
function onGeneCollected(gene) {
  geneScore += gene.points;
  collectedGenes.push(gene.typeData);
  spawnCollectionPopup(gene.x, gene.y, '+' + gene.points);
  triggerGeneNameFlash(gene.typeData.name);
}

/**
 * Increments currentSpeed up to MAX_SPEED each RUNNING frame.
 * All movement uses currentSpeed so the entire world accelerates uniformly.
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updateDifficultyRamp(deltaTime) {
  currentSpeed = Math.min(currentSpeed + CONFIG.SPEED_INCREMENT * deltaTime, CONFIG.MAX_SPEED);
}

// ---------------------------------------------------------------------------
// Popup particle helpers (Phase 5)
// ---------------------------------------------------------------------------

/**
 * Spawns a floating text popup at the given position that drifts upward and fades out.
 *
 * @param {number} x - Horizontal position in CSS pixels
 * @param {number} y - Vertical position in CSS pixels
 * @param {string} text - Text to display (e.g. '+10')
 */
function spawnCollectionPopup(x, y, text) {
  popups.push({ x, y, text, alpha: 1.0, vy: -60 });
}

/**
 * Advances all popup particles: drifts them upward and fades alpha.
 * Removes fully transparent popups.
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updatePopups(deltaTime) {
  for (const p of popups) {
    p.y += p.vy * deltaTime;
    p.alpha -= 1.2 * deltaTime;
  }
  popups = popups.filter(p => p.alpha > 0);
}

// ---------------------------------------------------------------------------
// Gene name flash helpers (Phase 5)
// ---------------------------------------------------------------------------

/**
 * Triggers a brief gene name flash display near the HUD score counter.
 *
 * @param {string} name - Gene name (e.g. 'PKD1')
 */
function triggerGeneNameFlash(name) {
  geneFlashName = name + '!';
  geneFlashTimer = CONFIG.GENE_LABEL_FLASH_DURATION;
}

/**
 * Counts down the gene name flash timer, clearing the name when it expires.
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updateGeneFlash(deltaTime) {
  if (geneFlashTimer > 0) {
    geneFlashTimer = Math.max(0, geneFlashTimer - deltaTime);
    if (geneFlashTimer === 0) geneFlashName = null;
  }
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
 * Checks all active obstacles for collision with the player (using shrunk hitboxes).
 * Distinguishes stomps (landing on top) from lethal collisions and near-misses.
 *
 * @param {Object} player - Player state object with x, y, velocityY
 * @returns {{ collision: Object|null, nearMiss: boolean, stomp: Object|null }}
 */
function checkCollisions(player) {
  const playerHitbox = getHitbox(
    { x: player.x, y: player.y, width: CONFIG.PLAYER_WIDTH, height: CONFIG.PLAYER_HEIGHT },
    CONFIG.PLAYER_HITBOX_SHRINK
  );

  for (const obs of obstacles) {
    const obsHitbox = getHitbox(obs, obs.hitboxShrink);
    if (aabbOverlap(playerHitbox, obsHitbox)) {
      // Stomp check: player must be falling AND player bottom near obstacle top
      const playerBottom = playerHitbox.y + playerHitbox.height;
      const obsTop = obsHitbox.y;
      if (player.velocityY > 0 && (playerBottom - obsTop) <= CONFIG.STOMP_THRESHOLD) {
        return { collision: null, nearMiss: false, stomp: obs };
      }
      return { collision: obs, nearMiss: false, stomp: null };
    }
  }

  // No collision -- check for near-miss (visual bounds overlap but hitbox didn't)
  const playerVisual = { x: player.x, y: player.y, width: CONFIG.PLAYER_WIDTH, height: CONFIG.PLAYER_HEIGHT };
  for (const obs of obstacles) {
    const obsVisual = { x: obs.x, y: obs.y, width: obs.width, height: obs.height };
    if (aabbOverlap(playerVisual, obsVisual)) {
      return { collision: null, nearMiss: true, stomp: null };
    }
  }

  return { collision: null, nearMiss: false, stomp: null };
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
// Stomp handling (Phase 6)
// ---------------------------------------------------------------------------

/**
 * Darkens a hex color string by a given factor (0-1, where 0 = black).
 *
 * @param {string} hex - Hex color string (e.g. '#B0C8E0')
 * @param {number} factor - Darkening factor (0.7 = 70% brightness)
 * @returns {string} Darkened hex color
 */
function darkenColor(hex, factor) {
  const r = Math.round(parseInt(hex.slice(1, 3), 16) * factor);
  const g = Math.round(parseInt(hex.slice(3, 5), 16) * factor);
  const b = Math.round(parseInt(hex.slice(5, 7), 16) * factor);
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Handles a successful stomp on an obstacle.
 * Decrements HP, bounces the player, restores 1 jump charge,
 * and spawns visual feedback (popup + ring on kill, popup on crack).
 *
 * @param {Object} obs - The stomped obstacle state object
 */
function handleStomp(obs) {
  obs.hp -= 1;

  // Bounce player upward and restore 1 jump charge
  player.velocityY = CONFIG.STOMP_BOUNCE_VELOCITY;
  player.jumpsRemaining = Math.min(player.jumpsRemaining + 1, 2);
  player.isGrounded = false;

  if (obs.hp <= 0) {
    // Destroyed: remove obstacle, spawn "POP!" popup + expanding ring
    const cx = obs.x + obs.width / 2;
    const cy = obs.y + obs.height / 2;
    spawnCollectionPopup(cx, cy, 'POP!');
    stompRings.push({
      x: cx,
      y: cy,
      radius: 5,
      maxRadius: 60,
      alpha: 1.0,
      color: CONFIG.STOMP_POP_COLOR,
    });
    obstacles = obstacles.filter(o => o !== obs);
  } else {
    // Damaged but alive: spawn "CRACK!" popup, darken obstacle color
    spawnCollectionPopup(obs.x + obs.width / 2, obs.y, 'CRACK!');
    obs.color = darkenColor(obs.color, 0.6);
  }
}

/**
 * Advances all stomp ring effects: grows radius and fades alpha.
 * Removes fully faded rings.
 *
 * @param {number} deltaTime - Seconds elapsed since last frame
 */
function updateStompRings(deltaTime) {
  for (const ring of stompRings) {
    const speed = (ring.maxRadius - 5) / 0.4; // expand over ~0.4s
    ring.radius += speed * deltaTime;
    ring.alpha -= 2.5 * deltaTime; // fade over ~0.4s
  }
  stompRings = stompRings.filter(r => r.alpha > 0);
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
  distance += currentSpeed * deltaTime;
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
    groundOffset += currentSpeed * deltaTime;
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
    updateDifficultyRamp(deltaTime);
    updateSpawning(deltaTime);
    updateObstacles(deltaTime);
    updateGeneSpawning(deltaTime);
    updateGenes(deltaTime);
    updatePopups(deltaTime);
    updateStompRings(deltaTime);
    updateGeneFlash(deltaTime);
    updatePlayer(player, deltaTime);

    // Advance near-miss flash timer
    if (nearMissTimer > 0) nearMissTimer -= deltaTime;

    // Gene collection check (before obstacle collision check)
    checkGeneCollisions(player);

    // Collision, near-miss, and stomp detection
    const collisionResult = checkCollisions(player);
    if (collisionResult.stomp) {
      handleStomp(collisionResult.stomp);
    } else if (collisionResult.collision) {
      triggerDeath(collisionResult.collision);
      // Skip rest of RUNNING rendering -- DYING state handles the next frame
    }

    if (gameState === 'RUNNING') {
      if (collisionResult.nearMiss && nearMissTimer <= 0) {
        nearMissTimer = CONFIG.NEAR_MISS_FLASH_DURATION;
      }

      drawObstacles(ctx, obstacles);
      drawGenes(ctx, genes);
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

      drawHUD(ctx, CONFIG, distance, collectedGenes.length, getTotalScore());
      drawPopups(ctx, popups);
      drawStompRings(ctx, stompRings);
      drawGeneFlash(ctx, CONFIG, geneFlashName, geneFlashTimer);
    }

  } else if (gameState === 'DYING') {
    deathTimer += deltaTime;
    updatePopups(deltaTime);
    updateStompRings(deltaTime);

    if (deathTimer >= CONFIG.DEATH_ANIMATION_DURATION) {
      // Transition to GAME_OVER: save high score, set timer
      const isNewRecord = saveHighScore(getTotalScore());
      highScore = loadHighScore();
      gameOverTimer = 0;
      gameState = 'GAME_OVER';
    }

    // Render all game content with screen shake; player flashes on/off
    drawWithShake(ctx, CONFIG, deathTimer, () => {
      drawGround(ctx, CONFIG, groundOffset);
      drawObstacles(ctx, obstacles);
      drawGenes(ctx, genes);

      // Player flash: visible every other DEATH_FLASH_INTERVAL
      const flashVisible = Math.floor(deathTimer / CONFIG.DEATH_FLASH_INTERVAL) % 2 === 0;
      if (flashVisible) {
        drawPlayer(ctx, player, CONFIG);
      }

      drawHUD(ctx, CONFIG, distance, collectedGenes.length, getTotalScore());
      drawPopups(ctx, popups);
      drawStompRings(ctx, stompRings);
    });

  } else if (gameState === 'PAUSED') {
    drawObstacles(ctx, obstacles);   // frozen in place (no update)
    drawGenes(ctx, genes);           // frozen in place (no update)
    drawPlayer(ctx, player, CONFIG); // frozen position (no updatePlayer call)
    drawHUD(ctx, CONFIG, distance, collectedGenes.length, getTotalScore());
    drawPopups(ctx, popups);
    drawStompRings(ctx, stompRings);
    drawPauseOverlay(ctx, CONFIG);

  } else if (gameState === 'GAME_OVER') {
    updateGameOver(deltaTime);
    drawObstacles(ctx, obstacles);   // frozen in place (no update)
    drawGenes(ctx, genes);           // frozen in place (no update)
    // Flash player during freeze delay, then show steadily
    if (gameOverTimer < CONFIG.GAME_OVER_FREEZE_DELAY) {
      const flashVisible = Math.floor(gameOverTimer / CONFIG.FLASH_INTERVAL) % 2 === 0;
      if (flashVisible) drawPlayer(ctx, player, CONFIG);
    } else {
      drawPlayer(ctx, player, CONFIG);
    }
    drawGameOverScreen(ctx, CONFIG, {
      distance: distance,
      geneScore: geneScore,
      totalScore: getTotalScore(),
      highScore: highScore,
      isNewRecord: getTotalScore() >= highScore && highScore > 0,
      collectedGenes: collectedGenes,
      gameOverTimer: gameOverTimer,
      restartCooldown: CONFIG.RESTART_COOLDOWN,
    });
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
  get genes()               { return genes; },
  get geneSpawnTimer()      { return geneSpawnTimer; },
  get geneScore()           { return geneScore; },
  get collectedGenes()      { return collectedGenes; },
  get currentSpeed()        { return currentSpeed; },
  get popups()              { return popups; },
  get stompRings()          { return stompRings; },
  get geneFlashName()       { return geneFlashName; },
  get highScore()           { return highScore; },
};

// Kick off the loop -- runs continuously even on the start screen for the
// pulsing animation
requestAnimationFrame(gameLoop);
