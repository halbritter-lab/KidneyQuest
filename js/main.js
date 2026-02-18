// main.js -- KidneyQuest module entry point
// Wires config, input, and renderer into a working game loop.

import CONFIG from './config.js';
import { setupCanvas, resizeCanvas, clearCanvas, drawText, drawGroundLine } from './renderer.js';
import { setupInput } from './input.js';

// Expose CONFIG globally so workshop participants can inspect and mutate values
// in the browser console, e.g. CONFIG.GROUND_COLOR = '#ff0000'
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
// Game state
// ---------------------------------------------------------------------------

// Simple string state machine.
// Phase 1: READY <-> RUNNING (RUNNING is a blank canvas with ground line)
// Phase 2+: RUNNING gains player physics; GAME_OVER added later
let gameState = 'READY';

// ---------------------------------------------------------------------------
// Input
// ---------------------------------------------------------------------------

function handleAction() {
  if (gameState === 'READY') {
    gameState = 'RUNNING';
    console.log('Game started!');
  } else if (gameState === 'GAME_OVER') {
    // Restart -- handled in Phase 5; reset to READY for now
    gameState = 'READY';
  }
  // gameState === 'RUNNING': no-op in Phase 1 (Phase 2 adds jump)
}

setupInput(canvas, handleAction);

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

function gameLoop(timestamp) {
  // Delta time in seconds, capped at 0.1s to prevent huge physics jumps on
  // tab switch or browser throttling
  const deltaTime = Math.min((timestamp - lastTime) / 1000, 0.1);
  lastTime = timestamp;

  // Clear canvas to background colour each frame
  clearCanvas(ctx, CONFIG);

  // Ground line is always visible regardless of state
  drawGroundLine(ctx, CONFIG);

  if (gameState === 'READY') {
    renderStartScreen(ctx, timestamp);
  }

  // gameState === 'RUNNING': blank canvas with ground line for now.
  // Phase 2 adds player rendering and physics using deltaTime.

  requestAnimationFrame(gameLoop);
}

// Kick off the loop -- runs continuously even on the start screen for the
// pulsing animation
requestAnimationFrame(gameLoop);
