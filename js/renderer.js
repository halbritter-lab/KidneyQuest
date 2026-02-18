// renderer.js -- Canvas setup and drawing utilities for KidneyQuest
// All functions use named exports for simplicity and tree-shakeability.

/**
 * Initialises the canvas with the correct internal resolution and applies
 * high-DPI (Retina) scaling, capped at 2x to avoid excessive memory use.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} config - Game CONFIG object
 * @returns {{ ctx: CanvasRenderingContext2D, dpr: number }}
 */
export function setupCanvas(canvas, config) {
  const ctx = canvas.getContext('2d');

  // Cap device pixel ratio at 2 to limit memory on high-DPI displays
  const dpr = Math.min(window.devicePixelRatio || 1, 2);

  // Set the internal (physical) pixel dimensions
  canvas.width = config.CANVAS_WIDTH * dpr;
  canvas.height = config.CANVAS_HEIGHT * dpr;

  // Scale the drawing context so all coordinates stay in CSS-pixel space
  ctx.scale(dpr, dpr);

  return { ctx, dpr };
}

/**
 * Scales the canvas CSS size to fill the viewport while preserving 16:9 ratio.
 * Call on init and on every window resize event.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {Object} config - Game CONFIG object
 */
export function resizeCanvas(canvas, config) {
  const scale = Math.min(
    window.innerWidth / config.CANVAS_WIDTH,
    window.innerHeight / config.CANVAS_HEIGHT,
  );
  canvas.style.width = `${config.CANVAS_WIDTH * scale}px`;
  canvas.style.height = `${config.CANVAS_HEIGHT * scale}px`;
}

/**
 * Fills the entire canvas with the background colour.
 * Uses fillRect rather than clearRect so the dark background colour is always solid.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config - Game CONFIG object
 */
export function clearCanvas(ctx, config) {
  ctx.fillStyle = config.BACKGROUND_COLOR;
  ctx.fillRect(0, 0, config.CANVAS_WIDTH, config.CANVAS_HEIGHT);
}

/**
 * Draws text centred at the given position with optional styling.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {string} text
 * @param {number} x - Horizontal centre position in CSS pixels
 * @param {number} y - Vertical centre position in CSS pixels
 * @param {Object} [options]
 * @param {string}  [options.font]     - CSS font string
 * @param {string}  [options.color]    - Fill colour
 * @param {number}  [options.alpha]    - Global alpha (0-1)
 * @param {string}  [options.align]    - textAlign value (default 'center')
 * @param {string}  [options.baseline] - textBaseline value (default 'middle')
 */
export function drawText(ctx, text, x, y, options = {}) {
  ctx.save();
  ctx.font = options.font || '20px sans-serif';
  ctx.fillStyle = options.color || '#FFFFFF';
  ctx.textAlign = options.align || 'center';
  ctx.textBaseline = options.baseline || 'middle';
  if (options.alpha !== undefined) {
    ctx.globalAlpha = options.alpha;
  }
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Draws the horizontal ground line across the full canvas width.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config - Game CONFIG object
 */
export function drawGroundLine(ctx, config) {
  ctx.fillStyle = config.GROUND_COLOR;
  ctx.fillRect(0, config.GROUND_Y, config.CANVAS_WIDTH, config.GROUND_LINE_WIDTH);
}
