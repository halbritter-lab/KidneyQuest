// main.js -- KidneyQuest module entry point
// Wires config, input, renderer, and player physics into a working game loop.

import CONFIG from './config.js';
import { setupCanvas, resizeCanvas, clearCanvas, drawText, drawGround, drawPlayer } from './renderer.js';
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
// Game state
// ---------------------------------------------------------------------------

// Simple string state machine.
// READY: start screen shown, waiting for first Space press
// RUNNING: game active, player physics running
// GAME_OVER: end screen (Phase 5+)
let gameState = 'READY';

// ---------------------------------------------------------------------------
// Input -- action callbacks
// ---------------------------------------------------------------------------

function handleAction() {
  if (gameState === 'READY') {
    gameState = 'RUNNING';
    console.log('Game started!');
    // Note: first Space press starts the game; it does NOT also trigger a jump.
    // Subsequent Space presses during RUNNING call handleJumpPress below.
  } else if (gameState === 'RUNNING') {
    handleJumpPress(player);
  } else if (gameState === 'GAME_OVER') {
    // Restart: reset player state and return to READY
    Object.assign(player, createPlayer(CONFIG));
    gameState = 'READY';
  }
}

function handleActionRelease() {
  if (gameState === 'RUNNING') {
    handleJumpRelease(player);
  }
}

setupInput(canvas, handleAction, handleActionRelease);

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
// Game loop
// ---------------------------------------------------------------------------

let lastTime = 0;

// Cumulative ground scroll distance in pixels.
// Increments at READY_SCROLL_SPEED on the start screen and at GAME_SPEED while running,
// creating a continuous motion illusion via the dash markers.
let groundOffset = 0;

function gameLoop(timestamp) {
  // Delta time in seconds, capped at 0.1s to prevent huge physics jumps on
  // tab switch or browser throttling
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  // Advance ground scroll based on current game state
  if (gameState === 'READY') {
    groundOffset += CONFIG.READY_SCROLL_SPEED * deltaTime;
  } else if (gameState === 'RUNNING') {
    groundOffset += CONFIG.GAME_SPEED * deltaTime;
  }

  // Clear canvas to background colour each frame
  clearCanvas(ctx, CONFIG);

  // Scrolling ground is always visible regardless of state
  drawGround(ctx, CONFIG, groundOffset);

  if (gameState === 'READY') {
    renderStartScreen(ctx, timestamp);
  }

  if (gameState === 'RUNNING') {
    // Advance physics for this frame
    updatePlayer(player, deltaTime);

    // Render player rectangle with squash/stretch
    drawPlayer(ctx, player, CONFIG);
  }

  requestAnimationFrame(gameLoop);
}

// Kick off the loop -- runs continuously even on the start screen for the
// pulsing animation
requestAnimationFrame(gameLoop);
