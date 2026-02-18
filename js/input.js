// input.js -- Keyboard and touch input handling for KidneyQuest
// Scopes input to the canvas element to avoid interfering with other page elements.

import CONFIG from './config.js';

/**
 * Minimal state tracker for Phase 2+ extensibility.
 * Currently tracks time of last action for debounce or cooldown logic,
 * and touch start time for variable jump height on mobile.
 */
export const inputState = {
  lastAction: 0,
  touchStartTime: 0,
};

/**
 * Sets up keyboard and touch input on the provided canvas element.
 *
 * @param {HTMLCanvasElement} canvas - The game canvas to attach listeners to.
 * @param {Function} onAction - Callback invoked on Space, ArrowUp, or touchstart.
 * @param {Function} onActionRelease - Callback invoked on Space/ArrowUp keyup or touchend.
 * @param {Function} onPause - Callback invoked on Escape or P keydown (default no-op).
 */
export function setupInput(canvas, onAction, onActionRelease, onPause = () => {}) {
  // Ensure canvas is focusable and auto-focused so keydown events fire on it
  canvas.tabIndex = 0;
  canvas.focus();

  // Keyboard: Space and ArrowUp trigger the action callback;
  // Escape and P trigger the pause callback
  canvas.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault(); // Prevent page scroll
      inputState.lastAction = performance.now();
      onAction();
    }
    if (e.code === 'Escape' || e.code === 'KeyP') {
      e.preventDefault();
      onPause();
    }
  });

  // Keyboard: Space and ArrowUp release triggers jump cut callback
  canvas.addEventListener('keyup', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault();
      if (onActionRelease) onActionRelease();
    }
  });

  // Touchstart: trigger action and prevent scroll/zoom/bounce
  // Record start time for variable jump height calculation on touchend
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    inputState.touchStartTime = performance.now();
    inputState.lastAction = inputState.touchStartTime;
    onAction();
  }, { passive: false });

  // Touchend: cut jump short if tap was shorter than TOUCH_JUMP_SHORT_MS threshold
  canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    const holdDuration = performance.now() - inputState.touchStartTime;
    if (holdDuration < CONFIG.TOUCH_JUMP_SHORT_MS) {
      // Short tap: cut the jump for a small hop
      if (onActionRelease) onActionRelease();
    } else {
      // Held long enough: full jump, still release
      if (onActionRelease) onActionRelease();
    }
  }, { passive: false });

  // Touchmove: only block scroll during drag, no action callback needed
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });
}
