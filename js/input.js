// input.js -- Keyboard and touch input handling for KidneyQuest
// Scopes input to the canvas element to avoid interfering with other page elements.

/**
 * Minimal state tracker for Phase 2+ extensibility.
 * Currently tracks time of last action for debounce or cooldown logic.
 */
export const inputState = {
  lastAction: 0,
};

/**
 * Sets up keyboard and touch input on the provided canvas element.
 *
 * @param {HTMLCanvasElement} canvas - The game canvas to attach listeners to.
 * @param {Function} onAction - Callback invoked on Space, ArrowUp, or touchstart.
 */
export function setupInput(canvas, onAction) {
  // Ensure canvas is focusable and auto-focused so keydown events fire on it
  canvas.tabIndex = 0;
  canvas.focus();

  // Keyboard: Space and ArrowUp trigger the action callback
  canvas.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault(); // Prevent page scroll
      inputState.lastAction = performance.now();
      onAction();
    }
  });

  // Touchstart: trigger action and prevent scroll/zoom/bounce
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    inputState.lastAction = performance.now();
    onAction();
  }, { passive: false });

  // Touchmove: only block scroll during drag, no action callback needed
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, { passive: false });
}
