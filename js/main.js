// main.js -- KidneyQuest module entry point
// Wires config, input, renderer, and player physics into a working game loop.

import CONFIG from './config.js';
import {
  setupCanvas, resizeCanvas, clearCanvas, drawText,
  drawGround, drawPlayer,
  drawCountdown, drawPauseOverlay, drawGameOver, drawHUD,
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
  // COUNTDOWN and PAUSED: ignore Space
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
  drawGround(ctx, CONFIG, groundOffset);

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
    updatePlayer(player, deltaTime);
    drawPlayer(ctx, player, CONFIG);
    drawHUD(ctx, CONFIG, distance);

  } else if (gameState === 'PAUSED') {
    drawPlayer(ctx, player, CONFIG); // frozen position (no updatePlayer call)
    drawHUD(ctx, CONFIG, distance);
    drawPauseOverlay(ctx, CONFIG);

  } else if (gameState === 'GAME_OVER') {
    updateGameOver(deltaTime);
    // Flash player during freeze delay, then show steadily
    if (gameOverTimer < CONFIG.GAME_OVER_FREEZE_DELAY) {
      const flashVisible = Math.floor(gameOverTimer / CONFIG.FLASH_INTERVAL) % 2 === 0;
      if (flashVisible) drawPlayer(ctx, player, CONFIG);
    } else {
      drawPlayer(ctx, player, CONFIG);
    }
    drawHUD(ctx, CONFIG, distance);
    drawGameOver(ctx, CONFIG, gameOverTimer);
  }

  requestAnimationFrame(gameLoop);
}

// Expose game state for testing and workshop debugging
window.__game = {
  get state()          { return gameState; },
  get distance()       { return distance; },
  get countdownValue() { return countdownValue; },
  get countdownTimer() { return countdownTimer; },
  get gameOverTimer()  { return gameOverTimer; },
  get groundOffset()   { return groundOffset; },
  get player()         { return player; },
};

// Kick off the loop -- runs continuously even on the start screen for the
// pulsing animation
requestAnimationFrame(gameLoop);
