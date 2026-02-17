# Phase 1: Foundation - Research

**Researched:** 2026-02-17
**Domain:** HTML Canvas with ES Modules
**Confidence:** HIGH

## Summary

Phase 1 requires building a clean foundation for a browser-based canvas game using modern JavaScript (ES Modules). The standard approach combines vanilla HTML5 Canvas API with native ES Modules architecture — no frameworks, no build tools, just modern browser APIs.

The user has locked in specific decisions: 16:9 aspect ratio (1280x720), deep dark blue-black background (#1a1a2e), three input methods (Space, ArrowUp, touch), flat mutable CONFIG object, and a pulsing "Press Space to Start" prompt. The technical challenges are: responsive canvas scaling without distortion, mobile touch handling with scroll prevention, auto-focus for immediate keyboard input, and smooth text animation using requestAnimationFrame.

Research focused on official MDN documentation for Canvas and ES Modules APIs, with web searches verifying best practices for high-DPI rendering, touch event handling, and game loop patterns. All core findings are verified against authoritative sources.

**Primary recommendation:** Use CSS transforms for display scaling, JavaScript for internal canvas resolution (including devicePixelRatio adjustment), tabindex="0" for keyboard focus, and passive:false event listeners for touch preventDefault.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| HTML5 Canvas API | Native | 2D graphics rendering | Built into all modern browsers, no dependencies needed |
| ES Modules | ES2015+ | Code organization | Native browser support since 2018, official JavaScript standard |
| requestAnimationFrame | Native | Animation loop timing | Browser-optimized rendering sync, 60fps default |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| None required | — | — | Vanilla implementation meets all requirements |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Vanilla Canvas | Phaser/PixiJS | Frameworks add 100KB+ and build complexity; overkill for simple runner |
| ES Modules | Build tools (Webpack/Vite) | Build step adds complexity; native modules work for workshop context |
| Native APIs | TypeScript | Type safety vs. simplicity; workshop benefits from direct browser execution |

**Installation:**
```bash
# No installation needed - all native browser APIs
# Serve with any static file server:
npx http-server -p 8080
# or Python:
python -m http.server 8080
```

## Architecture Patterns

### Recommended Project Structure
```
/
├── index.html                 # Entry point with single <script type="module">
├── css/
│   └── style.css             # Canvas centering and page layout
└── js/
    ├── main.js               # Module entry: setup canvas, start game loop
    ├── config.js             # Flat CONFIG object (default export)
    ├── input.js              # Keyboard and touch event handlers
    └── renderer.js           # Canvas drawing operations
```

### Pattern 1: ES Module Exports
**What:** Use default export for single-purpose modules (config), named exports for utilities
**When to use:** Always in ES Module architecture
**Example:**
```javascript
// config.js - Default export for single config object
export default {
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,
  BACKGROUND_COLOR: '#1a1a2e',
  GRAVITY: 1800,
  // ... all tunable values at top level
};

// input.js - Named exports for multiple handlers
export function setupKeyboard(canvas, onStart) { }
export function setupTouch(canvas, onStart) { }
```
Source: [MDN JavaScript Modules Guide](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)

### Pattern 2: Responsive Canvas Scaling
**What:** Set internal canvas resolution with JavaScript, scale display with CSS
**When to use:** Always when canvas needs to fit viewport
**Example:**
```javascript
// Set internal resolution (drawing buffer)
const dpr = window.devicePixelRatio || 1;
canvas.width = CONFIG.CANVAS_WIDTH * dpr;
canvas.height = CONFIG.CANVAS_HEIGHT * dpr;

// Scale display via CSS to fit viewport
const scale = Math.min(
  window.innerWidth / CONFIG.CANVAS_WIDTH,
  window.innerHeight / CONFIG.CANVAS_HEIGHT
);
canvas.style.width = `${CONFIG.CANVAS_WIDTH * scale}px`;
canvas.style.height = `${CONFIG.CANVAS_HEIGHT * scale}px`;

// Scale drawing context to match DPI
ctx.scale(dpr, dpr);
```
Source: [MDN Canvas Optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas), [web.dev High DPI Canvas](https://web.dev/articles/canvas-hidipi)

### Pattern 3: requestAnimationFrame Game Loop
**What:** Use requestAnimationFrame for animation timing, not setInterval/setTimeout
**When to use:** All canvas animations and game loops
**Example:**
```javascript
// Source: MDN Canvas Basic Animations
let lastTime = 0;

function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000; // Convert to seconds
  lastTime = timestamp;

  // Clear canvas
  ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  // Update game state
  update(deltaTime);

  // Render frame
  render(ctx);

  // Schedule next frame
  requestAnimationFrame(gameLoop);
}

// Start loop
requestAnimationFrame(gameLoop);
```
Source: [MDN Basic Animations](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations)

### Pattern 4: Touch Input with preventDefault
**What:** Use {passive: false} on touch listeners to prevent mobile scroll
**When to use:** Canvas games that need full-screen touch control
**Example:**
```javascript
// CRITICAL: {passive: false} allows preventDefault to work
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault(); // Prevents scroll, zoom, bounce
  handleTouch(e);
}, {passive: false});

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
}, {passive: false});
```
Source: [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events), [PassiveListenerTrap Blog](https://vcfvct.wordpress.com/2026/01/25/debugging-touch-controls-in-vanilla-js-the-passive-listener-trap/)

### Pattern 5: Canvas Focus for Keyboard Input
**What:** Add tabindex="0" to canvas element to enable keyboard events
**When to use:** When canvas needs keyboard input without prior click
**Example:**
```html
<canvas id="game-canvas" tabindex="0"></canvas>
```
```javascript
// Auto-focus canvas on page load
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas');
  canvas.focus();
});
```
Source: [dbp-consulting Canvas Key Events](http://www.dbp-consulting.com/tutorials/canvas/CanvasKeyEvents.html), [MDN tabindex](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Global_attributes/tabindex)

### Pattern 6: Text Animation (Pulse/Blink)
**What:** Use time-based alpha or scale modulation for pulsing text
**When to use:** Animated UI elements like "Press Space to Start"
**Example:**
```javascript
function renderStartPrompt(ctx, timestamp) {
  // Pulse alpha between 0.3 and 1.0 using sine wave
  const pulse = 0.3 + 0.7 * Math.abs(Math.sin(timestamp / 500));

  ctx.save();
  ctx.globalAlpha = pulse;
  ctx.fillStyle = CONFIG.TEXT_COLOR;
  ctx.font = '32px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('Press Space to Start', CONFIG.CANVAS_WIDTH / 2, CONFIG.CANVAS_HEIGHT / 2);
  ctx.restore();
}
```
Source: [MDN Canvas Drawing Text](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_text)

### Anti-Patterns to Avoid
- **Setting canvas size with CSS only:** This scales the drawing buffer, causing blurry rendering. Always set width/height attributes in JavaScript or HTML.
- **Using setInterval for animation:** Creates janky animation and wastes battery in background tabs. Use requestAnimationFrame.
- **Forgetting devicePixelRatio:** Canvas looks blurry on Retina/high-DPI displays. Always multiply canvas dimensions by devicePixelRatio.
- **Passive touch listeners when calling preventDefault:** Browsers default to passive:true for touchstart/touchmove, which blocks preventDefault. Explicitly set {passive: false}.
- **Drawing without clearRect:** Previous frames persist, creating trails. Always clear before drawing (unless trails are intentional).

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module bundling | Custom concatenation scripts | Native ES Modules | Browsers handle import resolution, caching, and loading natively since 2018 |
| Animation timing | Custom delta time calculators | requestAnimationFrame timestamp | Browser provides high-resolution timestamp and optimizes rendering sync |
| Touch vs. Mouse abstraction | Custom event normalizer | Pointer Events API (pointerdown/pointermove/pointerup) | Handles mouse, touch, and pen uniformly (but not needed if only keyboard+touch required) |
| DPI detection | Hardcoded 2x scaling | window.devicePixelRatio | Handles 1x, 2x, 3x, 4x displays automatically |
| Canvas text measurement | Manual width calculation | ctx.measureText(text).width | Returns accurate pixel width considering current font settings |

**Key insight:** Native browser APIs have matured significantly. For a simple game workshop, vanilla APIs provide everything needed without library overhead or build complexity.

## Common Pitfalls

### Pitfall 1: Canvas Size vs. Display Size Confusion
**What goes wrong:** Canvas appears blurry or distorted when scaled
**Why it happens:** CSS changes display size, but canvas internal resolution (width/height attributes) stays fixed. Drawing operations render to internal resolution, then browser scales the result to display size.
**How to avoid:**
- Set canvas.width and canvas.height (internal resolution) via JavaScript, not CSS
- Use CSS (canvas.style.width/height) only for display size
- Match internal resolution to display size × devicePixelRatio for sharp rendering
**Warning signs:** Canvas text/shapes look pixelated or blurry, especially on Retina displays

### Pitfall 2: Module Script Timing
**What goes wrong:** "Cannot read property 'getContext' of null" error
**Why it happens:** Module scripts have `defer` behavior by default, but canvas element might not exist yet
**How to avoid:**
- Place `<script type="module">` after `<canvas>` in HTML body
- OR wrap initialization in DOMContentLoaded listener
- OR use defer attribute (though modules defer automatically)
**Warning signs:** Errors only in some browsers/load conditions, works when reloading

### Pitfall 3: Passive Touch Listeners
**What goes wrong:** Mobile scroll prevention doesn't work, browser warns "Unable to preventDefault inside passive event listener"
**Why it happens:** Browsers made touch listeners passive by default in 2016 for scroll performance
**How to avoid:**
- Explicitly set {passive: false} when adding touchstart/touchmove listeners that call preventDefault
- Test on real mobile devices, not just desktop DevTools
**Warning signs:** preventDefault warnings in console, canvas scrolls/zooms on mobile despite preventDefault calls

### Pitfall 4: Mutable Config Scope
**What goes wrong:** Workshop participants can't tweak values in console, or changes don't persist
**Why it happens:** ES Modules have their own scope, variables aren't globally accessible
**How to avoid:**
- Export config as default: `export default { ... }`
- Expose on window in main.js: `window.CONFIG = CONFIG;`
- Participants can then use `CONFIG.GRAVITY = 2000` in console
**Warning signs:** `CONFIG is not defined` errors in console when trying to tweak values

### Pitfall 5: Canvas Not Receiving Keyboard Events
**What goes wrong:** Keyboard input only works after clicking canvas
**Why it happens:** Canvas elements aren't focusable by default
**How to avoid:**
- Add `tabindex="0"` to canvas element in HTML
- Call `canvas.focus()` on page load
- Consider showing visual focus indicator with CSS outline
**Warning signs:** Space key doesn't start game until user clicks canvas first

### Pitfall 6: Text Baseline Confusion
**What goes wrong:** Text appears in wrong vertical position, cut off, or inconsistent
**Why it happens:** Canvas text baseline defaults to 'alphabetic' (sits on baseline like handwriting), not 'top' or 'middle'
**How to avoid:**
- Explicitly set `ctx.textBaseline = 'middle'` for vertically centered text
- Use 'top' for top-aligned, 'bottom' for bottom-aligned
- Set once at render start if consistent across frame
**Warning signs:** Text position seems offset from expected Y coordinate by ~20-30%

### Pitfall 7: Forgetting to Scale Drawing Context on High-DPI
**What goes wrong:** Canvas is high-resolution but drawings appear tiny (1/2 or 1/4 size)
**Why it happens:** Setting canvas.width = WIDTH × dpr increases resolution, but drawing operations still use original coordinates
**How to avoid:**
- After setting canvas dimensions with devicePixelRatio, call `ctx.scale(dpr, dpr)`
- This transforms coordinate system so drawing at (100, 100) still appears at correct position
**Warning signs:** Drawings in top-left corner, much smaller than expected on high-DPI displays

## Code Examples

Verified patterns from official sources:

### Complete Canvas Setup with High-DPI Support
```javascript
// Source: MDN Canvas API + web.dev High DPI Canvas
function setupCanvas(canvas, width, height) {
  const ctx = canvas.getContext('2d');
  const dpr = window.devicePixelRatio || 1;

  // Set internal resolution (drawing buffer)
  canvas.width = width * dpr;
  canvas.height = height * dpr;

  // Scale display to fit viewport
  const scale = Math.min(
    window.innerWidth / width,
    window.innerHeight / height
  );
  canvas.style.width = `${width * scale}px`;
  canvas.style.height = `${height * scale}px`;

  // Scale drawing operations to match DPI
  ctx.scale(dpr, dpr);

  return ctx;
}
```

### Input Setup (Keyboard + Touch with preventDefault)
```javascript
// Source: MDN Touch Events + Canvas Key Events Tutorial
function setupInput(canvas, onAction) {
  // Make canvas focusable and focus it
  canvas.tabIndex = 0;
  canvas.focus();

  // Keyboard input (Space and ArrowUp)
  canvas.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'ArrowUp') {
      e.preventDefault(); // Prevent page scroll
      onAction();
    }
  });

  // Touch input (tap anywhere on canvas)
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault(); // Prevent scroll, zoom, bounce
    onAction();
  }, {passive: false}); // CRITICAL: allows preventDefault

  // Prevent touchmove from scrolling
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
  }, {passive: false});
}
```

### Game Loop with Delta Time
```javascript
// Source: MDN Basic Animations Tutorial
let lastTime = 0;
let gameState = 'READY'; // 'READY' | 'PLAYING' | 'GAME_OVER'

function gameLoop(timestamp) {
  const deltaTime = (timestamp - lastTime) / 1000; // seconds
  lastTime = timestamp;

  // Clear canvas
  ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

  // Update and render based on state
  if (gameState === 'READY') {
    renderStartScreen(ctx, timestamp);
  } else if (gameState === 'PLAYING') {
    updateGame(deltaTime);
    renderGame(ctx);
  }

  // Schedule next frame
  requestAnimationFrame(gameLoop);
}

// Start loop
requestAnimationFrame(gameLoop);
```

### Drawing Text with Proper Configuration
```javascript
// Source: MDN Canvas Drawing Text
function drawText(ctx, text, x, y, options = {}) {
  ctx.save();

  ctx.font = options.font || '32px sans-serif';
  ctx.fillStyle = options.color || '#FFFFFF';
  ctx.textAlign = options.align || 'center';
  ctx.textBaseline = options.baseline || 'middle';

  if (options.alpha !== undefined) {
    ctx.globalAlpha = options.alpha;
  }

  ctx.fillText(text, x, y);

  ctx.restore();
}

// Usage: Pulsing start prompt
function renderStartScreen(ctx, timestamp) {
  const pulse = 0.3 + 0.7 * Math.abs(Math.sin(timestamp / 500));

  drawText(ctx, 'KidneyQuest', CONFIG.CANVAS_WIDTH / 2, 200, {
    font: '64px sans-serif',
    color: '#FFFFFF'
  });

  drawText(ctx, 'Press Space to Start', CONFIG.CANVAS_WIDTH / 2, 400, {
    font: '32px sans-serif',
    color: '#FFFFFF',
    alpha: pulse
  });
}
```

### Flat Mutable Config Object
```javascript
// config.js - Source: User decision from CONTEXT.md + ES Modules pattern
export default {
  // Canvas dimensions
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // Colors (easy to theme)
  BACKGROUND_COLOR: '#1a1a2e',
  GROUND_COLOR: '#444444',
  TEXT_COLOR: '#FFFFFF',
  PLAYER_COLOR: '#00FF00',

  // Physics (mutable at runtime)
  GRAVITY: 1800,
  JUMP_VELOCITY: -650,
  GROUND_Y: 600,

  // Speeds
  GAME_SPEED: 200,
  SPEED_INCREMENT: 5,
  MAX_SPEED: 500,
};

// main.js - Expose for console tweaking
import CONFIG from './config.js';
window.CONFIG = CONFIG; // Workshop participants can now type CONFIG.GRAVITY = 2000
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| RequireJS/AMD modules | ES Modules (import/export) | 2018 (native support) | No build tools needed for modern browsers |
| setInterval/setTimeout animation | requestAnimationFrame | 2012+ | Smoother 60fps, better battery life |
| jQuery for DOM manipulation | Native DOM APIs | 2015+ | getElementById, addEventListener are fast and simple |
| Canvas frameworks (Phaser 2.x) | Vanilla Canvas or modern Phaser 3 | 2018+ | Lighter weight, better performance |
| Default passive:false listeners | Default passive:true for touch | 2016 (Chrome 51) | Must explicitly opt-out for preventDefault |
| File:// protocol for local dev | HTTP server required for modules | 2018+ | Modules don't work on file:// due to CORS |

**Deprecated/outdated:**
- **CommonJS (require/module.exports):** Still used in Node.js, but browsers need ES Modules
- **Vendor prefixes for requestAnimationFrame:** All modern browsers support unprefixed `requestAnimationFrame()`
- **Flash/Canvas fallbacks:** Flash EOL 2020, no fallback needed
- **Manual devicePixelRatio detection:** window.devicePixelRatio is universally supported, default to 1 if undefined

## Open Questions

Things that couldn't be fully resolved:

1. **Font Loading Timing**
   - What we know: Custom fonts loaded via CSS @font-face may not be ready when canvas first draws
   - What's unclear: Best practice for ensuring fonts are loaded before rendering text
   - Recommendation: Use system fonts for Phase 1 (sans-serif), defer custom fonts to Phase 6 (visual polish)

2. **Canvas Maximum Dimensions**
   - What we know: Browsers have limits (typically 4096-16384px per dimension), exceeds make canvas unusable
   - What's unclear: Whether 1280×720 × devicePixelRatio (up to 5120×2880 on 4x displays) could hit limits
   - Recommendation: Cap devicePixelRatio at 2 or 3 to avoid edge cases: `Math.min(window.devicePixelRatio, 2)`

3. **Mobile Viewport Height**
   - What we know: Mobile browsers have dynamic viewport height (changes when address bar hides/shows)
   - What's unclear: Whether resize listener should debounce, or if continuous resizing is acceptable
   - Recommendation: Start without debouncing, add only if performance issues observed

## Sources

### Primary (HIGH confidence)
- [MDN Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API) - Core canvas concepts and interfaces
- [MDN JavaScript Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules) - ES Module syntax and best practices
- [MDN Canvas Optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas) - Official performance techniques
- [MDN Touch Events](https://developer.mozilla.org/en-US/docs/Web/API/Touch_events) - Touch event handling and passive listeners
- [MDN Drawing Text](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Drawing_text) - Text rendering API
- [MDN Basic Animations](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Basic_animations) - requestAnimationFrame patterns

### Secondary (MEDIUM confidence)
- [web.dev High DPI Canvas](https://web.dev/articles/canvas-hidipi) - devicePixelRatio handling patterns
- [Passive Listener Trap Blog](https://vcfvct.wordpress.com/2026/01/25/debugging-touch-controls-in-vanilla-js-the-passive-listener-trap/) - Recent 2026 article on touch preventDefault
- [dbp-consulting Canvas Key Events](http://www.dbp-consulting.com/tutorials/canvas/CanvasKeyEvents.html) - tabindex for canvas focus
- [Kirupa Canvas High DPI](https://www.kirupa.com/canvas/canvas_high_dpi_retina.htm) - Retina display patterns
- [TheLinuxCode Canvas Font Rendering](https://thelinuxcode.com/html-canvas-font-property-practical-patterns-for-reliable-text-rendering/) - 2026 production patterns for canvas fonts

### Tertiary (LOW confidence)
- Various game loop tutorials - Concepts verified against MDN, specific implementations vary

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All native APIs, verified with official MDN documentation
- Architecture: HIGH - ES Modules and Canvas patterns are well-established, MDN-documented
- Pitfalls: HIGH - Based on MDN official docs and verified 2026 blog posts about passive listeners
- Code examples: HIGH - All examples sourced from or verified against MDN tutorials

**Research date:** 2026-02-17
**Valid until:** 2027-02-17 (1 year - native browser APIs are very stable)

**Notes for planner:**
- User decisions from CONTEXT.md are prescriptive — use locked choices (1280x720, #1a1a2e, flat CONFIG, etc.)
- Existing POC code (index.html, js/*.js) should be evaluated but may need rewrite for clean foundation
- Workshop context is critical: code must be readable, console-tweakable, and work without build tools
- All findings verified against authoritative sources (MDN, official specs, recent 2026 articles)
