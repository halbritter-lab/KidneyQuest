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
 * Draws the scrolling two-tone ground with dash markers for motion illusion.
 * Call every frame with an accumulating groundOffset to animate the markers.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config       - Game CONFIG object
 * @param {number} groundOffset - Cumulative scroll distance in pixels (increases each frame)
 */
export function drawGround(ctx, config, groundOffset) {
  // Fill the earth band (ground area below the surface line)
  ctx.fillStyle = config.GROUND_COLOR;
  ctx.fillRect(0, config.GROUND_Y, config.CANVAS_WIDTH, config.CANVAS_HEIGHT - config.GROUND_Y);

  // Draw the bright surface line at GROUND_Y
  ctx.fillStyle = config.GROUND_LINE_COLOR || '#4A90D9';
  ctx.fillRect(0, config.GROUND_Y, config.CANVAS_WIDTH, config.GROUND_LINE_WIDTH);

  // Draw scrolling dash markers below the surface line
  // Two-segment tile approach: phase shifts all dashes left at scroll speed
  const spacing = config.GROUND_MARKER_SPACING;
  const phase = groundOffset % spacing;
  const markerY = config.GROUND_Y + config.GROUND_MARKER_Y_OFFSET;

  ctx.fillStyle = config.GROUND_MARKER_COLOR;
  for (let x = -phase; x < config.CANVAS_WIDTH + spacing; x += spacing) {
    ctx.fillRect(
      Math.round(x),
      markerY,
      config.GROUND_MARKER_WIDTH,
      config.GROUND_MARKER_HEIGHT,
    );
  }
}

// ---------------------------------------------------------------------------
// HUD and overlay renderers
// ---------------------------------------------------------------------------

/**
 * Draws the HUD in the top-right corner: distance, gene count, and total score.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config - Game CONFIG object
 * @param {number} distance - Cumulative scroll distance in pixels
 * @param {number} geneCount - Number of genes collected this run
 * @param {number} totalScore - Combined distance + gene score
 */
export function drawHUD(ctx, config, distance, geneCount, totalScore) {
  const meters = Math.floor(distance / config.PX_PER_METER);

  drawText(ctx, meters + 'm | Genes: ' + geneCount,
    config.CANVAS_WIDTH - 20, 30,
    { font: 'bold 22px sans-serif', color: '#FFFFFF', align: 'right', baseline: 'top' }
  );

  drawText(ctx, 'Score: ' + totalScore,
    config.CANVAS_WIDTH - 20, 58,
    { font: '18px sans-serif', color: '#FFD700', align: 'right', baseline: 'top' }
  );
}

/**
 * Draws all active floating popup particles (e.g. '+10' on gene collection).
 * Each popup drifts upward and fades out as its alpha decreases.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} popups - Array of popup objects ({x, y, text, alpha, vy})
 */
export function drawPopups(ctx, popups) {
  for (const p of popups) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.alpha);
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.text, Math.round(p.x), Math.round(p.y));
    ctx.restore();
  }
}

/**
 * Draws a brief gene name flash near the HUD score counter when a gene is collected.
 * Alpha fades in over the first 0.3 seconds and then holds.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config - Game CONFIG object
 * @param {string|null} geneFlashName - Gene name to display (e.g. 'PKD1!'), or null
 * @param {number} geneFlashTimer - Remaining display time in seconds
 */
export function drawGeneFlash(ctx, config, geneFlashName, geneFlashTimer) {
  if (!geneFlashName || geneFlashTimer <= 0) return;
  const alpha = Math.min(1.0, geneFlashTimer / 0.3);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#FFD700';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.fillText(geneFlashName, config.CANVAS_WIDTH - 20, 84);
  ctx.restore();
}

/**
 * Draws the full educational game over screen with score breakdown, gene cards,
 * high score comparison, and a pulsing restart prompt after the cooldown expires.
 *
 * Gene cards display up to the 5 most recent unique genes collected, each showing:
 * - Gene name and point value
 * - Disease name and inheritance pattern
 * - Brief description (truncated to 90 chars)
 * - OMIM ID
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config - Game CONFIG object
 * @param {Object} options
 * @param {number}  options.distance       - Cumulative distance in pixels
 * @param {number}  options.geneScore      - Score from collected genes
 * @param {number}  options.totalScore     - Combined distance + gene score
 * @param {number}  options.highScore      - All-time high score from localStorage
 * @param {boolean} options.isNewRecord    - Whether this run set a new high score
 * @param {Array}   options.collectedGenes - Array of gene typeData objects collected
 * @param {number}  options.gameOverTimer  - Seconds elapsed since game over
 * @param {number}  options.restartCooldown - Seconds before restart is accepted
 */
export function drawGameOverScreen(ctx, config, options) {
  const cx = config.CANVAS_WIDTH / 2;

  // Semi-transparent overlay
  ctx.fillStyle = 'rgba(0, 0, 10, 0.88)';
  ctx.fillRect(0, 0, config.CANVAS_WIDTH, config.CANVAS_HEIGHT);

  // Title
  drawText(ctx, 'GAME OVER', cx, 60,
    { font: 'bold 48px sans-serif', color: '#FF4444' });

  // Score breakdown
  const meters = Math.floor(options.distance / config.PX_PER_METER);
  drawText(ctx, 'Distance: ' + meters + 'm', cx, 115,
    { font: '24px sans-serif', color: '#FFFFFF' });
  drawText(ctx, 'Gene Score: ' + options.geneScore, cx, 145,
    { font: '24px sans-serif', color: '#FFFFFF' });
  drawText(ctx, 'Total: ' + options.totalScore, cx, 180,
    { font: 'bold 28px sans-serif', color: '#FFD700' });

  // High score comparison
  if (options.isNewRecord) {
    drawText(ctx, 'NEW HIGH SCORE!', cx, 212,
      { font: 'bold 20px sans-serif', color: '#00FF88' });
  } else if (options.highScore > 0) {
    drawText(ctx, 'Best: ' + options.highScore, cx, 212,
      { font: '18px sans-serif', color: '#AAAAAA' });
  }

  // Gene cards (up to 5 most recent, deduplicated by name)
  const displayGenes = options.collectedGenes.slice(-5);
  const uniqueGenes = [];
  const seen = new Set();
  for (const g of displayGenes) {
    if (!seen.has(g.name)) {
      seen.add(g.name);
      uniqueGenes.push(g);
    }
  }

  if (uniqueGenes.length > 0) {
    drawText(ctx, 'Genes Collected:', cx, 245,
      { font: 'bold 18px sans-serif', color: '#FFFFFF' });

    const cardW = 500;
    const cardH = 80;
    const cardX = (config.CANVAS_WIDTH - cardW) / 2;
    let cardY = 265;

    for (const gene of uniqueGenes) {
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fillRect(cardX, cardY, cardW, cardH);

      ctx.fillStyle = gene.color;
      ctx.fillRect(cardX, cardY, 6, cardH);

      drawText(ctx, gene.name + '  (+' + gene.points + 'pts)',
        cardX + 20, cardY + 16,
        { font: 'bold 15px sans-serif', color: gene.color, align: 'left', baseline: 'top' });

      drawText(ctx, gene.diseaseName + ' - ' + gene.inheritance,
        cardX + 20, cardY + 34,
        { font: '12px sans-serif', color: '#CCCCCC', align: 'left', baseline: 'top' });

      drawText(ctx, gene.description.length > 90 ? gene.description.substring(0, 87) + '...' : gene.description,
        cardX + 20, cardY + 50,
        { font: '11px sans-serif', color: '#999999', align: 'left', baseline: 'top' });

      drawText(ctx, 'OMIM: ' + gene.omimId,
        cardX + 20, cardY + 65,
        { font: '10px sans-serif', color: '#777777', align: 'left', baseline: 'top' });

      cardY += cardH + 6;
    }

    if (options.collectedGenes.length > 5) {
      drawText(ctx, '...and ' + (options.collectedGenes.length - 5) + ' more genes collected',
        cx, cardY + 10,
        { font: '14px sans-serif', color: '#888888' });
    }
  } else {
    drawText(ctx, 'No genes collected this run', cx, 260,
      { font: '18px sans-serif', color: '#666666' });
  }

  // Restart prompt (after cooldown)
  if (options.gameOverTimer >= options.restartCooldown) {
    const pulse = 0.4 + 0.6 * Math.abs(Math.sin(options.gameOverTimer * 2.5));
    drawText(ctx, 'Press Space to restart', cx, config.CANVAS_HEIGHT - 40,
      { font: '22px sans-serif', color: '#FFFFFF', alpha: pulse });
  }
}

/**
 * Draws a pulsing countdown number (3-2-1) or "Go!" when countdownValue === 0.
 * Size pulses from large to smaller within each COUNTDOWN_STEP interval.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config - Game CONFIG object
 * @param {number} countdownValue - Current digit (3, 2, 1, or 0 for "Go!")
 * @param {number} countdownTimer - Time elapsed within the current step (seconds)
 */
export function drawCountdown(ctx, config, countdownValue, countdownTimer) {
  const label = countdownValue > 0 ? String(countdownValue) : 'Go!';
  const color = countdownValue > 0 ? config.COUNTDOWN_COLOR : config.COUNTDOWN_GO_COLOR;

  // Pulse: start large at the beginning of each step, shrink toward the end
  const pulse = 1.0 - (countdownTimer / config.COUNTDOWN_STEP) * 0.3;
  const fontSize = Math.round(120 * pulse);

  const cx = config.CANVAS_WIDTH / 2;
  const cy = config.CANVAS_HEIGHT / 2;

  drawText(ctx, label, cx, cy, {
    font: `bold ${fontSize}px sans-serif`,
    color,
  });
}

/**
 * Draws a semi-transparent pause overlay with "PAUSED" and resume hint text.
 * Uses ctx.save/restore around the overlay fill to preserve alpha state.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config - Game CONFIG object
 */
export function drawPauseOverlay(ctx, config) {
  const cx = config.CANVAS_WIDTH / 2;
  const cy = config.CANVAS_HEIGHT / 2;

  // Dim the screen with a semi-transparent black overlay
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, config.CANVAS_WIDTH, config.CANVAS_HEIGHT);
  ctx.restore();

  // "PAUSED" centred, bold 64px, white
  drawText(ctx, 'PAUSED', cx, cy - 40, {
    font: 'bold 64px sans-serif',
    color: '#FFFFFF',
  });

  // Resume hint -- smaller, slightly transparent
  drawText(ctx, 'Press Escape to resume', cx, cy + 30, {
    font: '24px sans-serif',
    color: '#FFFFFF',
    alpha: 0.7,
  });
}

/**
 * Draws the game over screen in three phases:
 *   Phase 1 (gameOverTimer < GAME_OVER_FREEZE_DELAY): semi-transparent overlay only
 *   Phase 2 (>= GAME_OVER_FREEZE_DELAY): "Game Over" text, killer obstacle name, distance score
 *   Phase 3 (>= GAME_OVER_FREEZE_DELAY + GAME_OVER_COOLDOWN): pulsing restart prompt
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config - Game CONFIG object
 * @param {number} gameOverTimer - Seconds elapsed since game over was triggered
 * @param {string|null} killerObstacleName - displayName of the obstacle that ended the run
 * @param {number} distance - Cumulative distance in pixels for score display
 */
export function drawGameOver(ctx, config, gameOverTimer, killerObstacleName, distance) {
  const cx = config.CANVAS_WIDTH / 2;
  const cy = config.CANVAS_HEIGHT / 2;

  // Semi-transparent dark overlay covering the frozen game state
  ctx.save();
  ctx.fillStyle = `rgba(0, 0, 0, ${config.GAME_OVER_OVERLAY_ALPHA})`;
  ctx.fillRect(0, 0, config.CANVAS_WIDTH, config.CANVAS_HEIGHT);
  ctx.restore();

  // Phase 1: overlay is visible but no text yet (allows death animation to settle)
  if (gameOverTimer < config.GAME_OVER_FREEZE_DELAY) {
    return;
  }

  // Phase 2+: "Game Over" centred in red
  drawText(ctx, 'Game Over', cx, cy - 60, {
    font: 'bold 72px sans-serif',
    color: config.GAME_OVER_COLOR,
  });

  // Killer obstacle name -- what ended the run
  if (killerObstacleName) {
    drawText(ctx, `Hit a ${killerObstacleName}!`, cx, cy + 0, {
      font: 'bold 32px sans-serif',
      color: '#FFAA44',
    });
  }

  // Distance score
  const meters = Math.floor((distance || 0) / config.PX_PER_METER);
  drawText(ctx, `Distance: ${meters}m`, cx, cy + 46, {
    font: '28px sans-serif',
    color: '#FFFFFF',
  });

  // Phase 3: pulsing "Press Space to Play Again" after cooldown expires
  if (gameOverTimer >= config.GAME_OVER_FREEZE_DELAY + config.GAME_OVER_COOLDOWN) {
    const alpha = 0.3 + 0.7 * Math.abs(Math.sin(gameOverTimer * 3));
    drawText(ctx, 'Press Space to Play Again', cx, cy + 100, {
      font: '28px sans-serif',
      color: '#FFFFFF',
      alpha,
    });
  }
}

/**
 * Screen shake wrapper for the death animation.
 * Translates the entire canvas by a random offset that decays linearly over
 * DEATH_SHAKE_DURATION. After the shake period, draws normally with no offset.
 * Math.round on offsets prevents sub-pixel blurring.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} config - Game CONFIG object
 * @param {number} deathTimer - Seconds elapsed since death triggered
 * @param {Function} drawFn - Callback that performs the actual draw calls
 */
export function drawWithShake(ctx, config, deathTimer, drawFn) {
  const duration = config.DEATH_SHAKE_DURATION;
  const amplitude = config.SHAKE_AMPLITUDE;

  if (deathTimer >= duration) {
    drawFn();
    return;
  }

  const progress = deathTimer / duration;
  const currentAmplitude = amplitude * (1.0 - progress);

  const dx = (Math.random() * 2 - 1) * currentAmplitude;
  const dy = (Math.random() * 2 - 1) * currentAmplitude * 0.6;

  ctx.save();
  ctx.translate(Math.round(dx), Math.round(dy));
  drawFn();
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Stomp ring drawing (Phase 6)
// ---------------------------------------------------------------------------

/**
 * Draws expanding white ring effects at stomp-kill locations.
 * Each ring grows in radius and fades out over its lifetime.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} stompRings - Array of ring objects ({x, y, radius, maxRadius, alpha})
 */
export function drawStompRings(ctx, stompRings) {
  for (const ring of stompRings) {
    if (ring.alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = Math.max(0, ring.alpha);
    ctx.strokeStyle = ring.color || '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(Math.round(ring.x), Math.round(ring.y), ring.radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// ---------------------------------------------------------------------------
// Obstacle drawing
// ---------------------------------------------------------------------------

/**
 * Draws all active obstacles as filled colored rectangles.
 * Uses Math.round on positions for crisp pixel-aligned edges.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} obstacles - Array of obstacle state objects ({x, y, width, height, color})
 */
export function drawObstacles(ctx, obstacles) {
  for (const obs of obstacles) {
    ctx.fillStyle = obs.color;
    ctx.fillRect(Math.round(obs.x), Math.round(obs.y), obs.width, obs.height);
  }
}

// ---------------------------------------------------------------------------
// Gene collectible drawing (Phase 5)
// ---------------------------------------------------------------------------

/**
 * Draws all active gene collectibles as colored rectangles with name labels.
 * Uses Math.round on positions for crisp pixel-aligned edges.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} genes - Array of gene state objects ({x, y, width, height, color, type})
 */
export function drawGenes(ctx, genes) {
  for (const gene of genes) {
    // Colored rectangle
    ctx.fillStyle = gene.color;
    ctx.fillRect(Math.round(gene.x), Math.round(gene.y), gene.width, gene.height);

    // White border for visibility
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(gene.x) + 0.5, Math.round(gene.y) + 0.5, gene.width - 1, gene.height - 1);

    // Gene name label above the rectangle
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(gene.type, Math.round(gene.x) + gene.width / 2, Math.round(gene.y) - 2);
  }
}

// ---------------------------------------------------------------------------
// Zebra character drawing -- procedural Canvas 2D, no external images
// ---------------------------------------------------------------------------

/**
 * Draws a single frame of the chibi zebra character using Canvas 2D primitives.
 * Coordinates are relative to (0, 0) at top-left of the frameWidth x frameHeight box.
 * The caller (drawPlayer) handles positioning via ctx.translate / ctx.scale.
 *
 * Design: chibi proportions -- big head (~57% of height), small body, stubby legs.
 * Colors: white body (#FFFFFF), black stripes and outlines (#111111), pink accents (#FFB6C1).
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} frameWidth  - Width of the drawing area in CSS pixels
 * @param {number} frameHeight - Height of the drawing area in CSS pixels
 * @param {string} animState   - Current animation state ('idle','run','jump','fall','land','doubleJump')
 * @param {number} animFrame   - Current frame index within the state
 */
function drawZebraFrame(ctx, frameWidth, frameHeight, animState, animFrame) {
  // ---- Layout constants (all proportional to frameWidth / frameHeight) ----
  const cx = frameWidth / 2;          // horizontal centre

  // Vertical breakdown (from top):
  //   ears:   ~8% of height
  //   head:   ~49% of height  (big chibi head -- centre of head at headCY)
  //   body:   ~25% of height
  //   legs:   ~18% of height

  const headRadius   = frameWidth  * 0.38;   // big round head
  const headCY       = frameHeight * 0.40;   // head centre Y (from top of frame)
  const bodyTop      = frameHeight * 0.62;
  const bodyHeight   = frameHeight * 0.22;
  const bodyWidth    = frameWidth  * 0.52;
  const legHeight    = frameHeight * 0.18;
  const legWidth     = frameWidth  * 0.14;
  const earW         = frameWidth  * 0.12;
  const earH         = frameHeight * 0.10;

  // Body left edge (centred)
  const bodyLeft  = cx - bodyWidth / 2;
  const bodyBottom = bodyTop + bodyHeight;

  // ---- Pose offsets by animState / animFrame ----------------------------- //

  // bodyBob: vertical offset applied to the entire character (idle sway, etc.)
  // bodyTilt: rotation in radians for run forward lean
  // legOffsets: [frontLegY, backLegY] -- offsets from bodyBottom for leg tops
  // earTilt: ear rotation for wind / jump effects
  // tailAngle: tail arc angle in radians

  let bodyBob     = 0;
  let bodyTilt    = 0;
  let frontLegExt = 0;    // how far front legs extend downward (beyond normal)
  let backLegExt  = 0;    // how far back legs extend downward (beyond normal)
  let frontLegX   = cx - bodyWidth * 0.25;
  let backLegX    = cx + bodyWidth * 0.18;
  let earTiltLeft  = 0;   // radians, applied to left ear
  let earTiltRight = 0;
  let tailAngle   = -0.4; // default tail angle (radians, clockwise from down)
  let pupilOffX   = 0;    // pupil gaze offset
  let pupilOffY   = 0;

  switch (animState) {

    // -- idle: subtle body bob, ear and pupil micro-movement ----------------
    case 'idle': {
      const bobPattern = [0, -2, 0, 1];
      bodyBob = bobPattern[animFrame % 4];
      earTiltLeft  = (animFrame % 2 === 0) ?  0.05 : -0.05;
      earTiltRight = (animFrame % 2 === 0) ? -0.05 :  0.05;
      // Pupil shifts slightly between frames
      pupilOffX = (animFrame === 1 || animFrame === 2) ? 1 : 0;
      break;
    }

    // -- run: leg alternation, slight forward tilt, tail bounce --------------
    case 'run': {
      // Forward lean
      bodyTilt = 0.10;  // ~6 degrees

      // 6-frame run cycle: legs alternate like a trot
      const runCycle = [
        { fExt: 6,  bExt: 0,  fX: -0.30, bX: 0.22, tail: -0.5 },  // frame 0: front extended
        { fExt: 3,  bExt: 3,  fX: -0.25, bX: 0.18, tail: -0.4 },  // frame 1: crossing
        { fExt: 0,  bExt: 6,  fX: -0.20, bX: 0.14, tail: -0.3 },  // frame 2: back extended
        { fExt: 3,  bExt: 3,  fX: -0.25, bX: 0.18, tail: -0.4 },  // frame 3: crossing back
        { fExt: 6,  bExt: 0,  fX: -0.30, bX: 0.22, tail: -0.5 },  // frame 4: front extended
        { fExt: 0,  bExt: 6,  fX: -0.20, bX: 0.14, tail: -0.3 },  // frame 5: back again
      ];
      const r = runCycle[animFrame % 6];
      frontLegExt = r.fExt;
      backLegExt  = r.bExt;
      frontLegX   = cx + bodyWidth * r.fX;
      backLegX    = cx + bodyWidth * r.bX;
      tailAngle   = r.tail;
      bodyBob     = (animFrame % 2 === 0) ? -1 : 1;  // slight bounce
      break;
    }

    // -- jump: legs tucked, body compact -------------------------------------
    case 'jump': {
      if (animFrame === 0) {
        // Tucked: legs pulled up toward body
        frontLegExt = -legHeight * 0.4;  // negative = legs drawn shorter
        backLegExt  = -legHeight * 0.4;
        tailAngle   = 0.4;               // tail up
        earTiltLeft  = -0.15;
        earTiltRight =  0.15;            // ears up/alert
      } else {
        // Frame 1: body stretching upward, ears pointed up
        bodyBob      = -3;
        frontLegExt  = -legHeight * 0.2;
        backLegExt   = -legHeight * 0.2;
        earTiltLeft  = -0.20;
        earTiltRight =  0.20;
        tailAngle    = 0.6;
      }
      break;
    }

    // -- fall: legs extended down, ears blown back (wind) --------------------
    case 'fall': {
      // Ears tilted backward (wind effect)
      earTiltLeft  =  0.30;
      earTiltRight =  0.30;
      if (animFrame === 0) {
        frontLegExt  = legHeight * 0.3;   // legs extended downward
        backLegExt   = legHeight * 0.3;
        tailAngle    = 0.5;               // tail blown up
      } else {
        frontLegExt  = legHeight * 0.15;
        backLegExt   = legHeight * 0.40;
        tailAngle    = 0.6;
      }
      break;
    }

    // -- land: squish frames (squash/stretch is applied by drawPlayer via     //
    //    ctx.scale -- these frames refine the pose on top of that transform) -
    case 'land': {
      if (animFrame === 0) {
        // Maximum squish: wide stance, legs very short, tail splayed
        frontLegExt  = -legHeight * 0.35;
        backLegExt   = -legHeight * 0.35;
        frontLegX    = cx - bodyWidth * 0.38;
        backLegX     = cx + bodyWidth * 0.30;
        tailAngle    = 0.0;
        bodyBob      = 3;
      } else if (animFrame === 1) {
        // Partial recovery
        frontLegExt  = -legHeight * 0.15;
        backLegExt   = -legHeight * 0.15;
        bodyBob      = 1;
        tailAngle    = -0.2;
      } else {
        // Frame 2: nearly normal standing pose
        bodyBob      = 0;
        tailAngle    = -0.4;
      }
      break;
    }

    // -- doubleJump: spinning visual -- body rotates each frame --------------
    case 'doubleJump': {
      // Frame 0: ~90 degree rotation, Frame 1: ~180 degree rotation
      // Rotation is handled below after drawing, using ctx.rotate at centre
      bodyBob     = -2;
      earTiltLeft  = -0.30;
      earTiltRight =  0.30;
      tailAngle    = 0.8;
      break;
    }

    default:
      break;
  }

  // ---- Apply double-jump spin via full context rotation -------------------
  // We rotate the entire character around the character's visual centre.
  ctx.save();
  if (animState === 'doubleJump') {
    const spinAngle = (animFrame === 0) ? Math.PI / 2 : Math.PI;
    const charCX = cx;
    const charCY = frameHeight * 0.55;  // approximate visual centre of character
    ctx.translate(charCX, charCY + bodyBob);
    ctx.rotate(spinAngle);
    ctx.translate(-charCX, -charCY);
    // Compensate bodyBob translation already applied via translate above
    bodyBob = 0;
  }

  // ---- Apply run body tilt ------------------------------------------------
  if (bodyTilt !== 0) {
    ctx.translate(cx, bodyBottom + bodyBob);
    ctx.rotate(bodyTilt);
    ctx.translate(-cx, -(bodyBottom + bodyBob));
  }

  // -------------------------------------------------------------------------
  // Drawing order (bottom-up): legs -> tail -> body -> head -> details
  // -------------------------------------------------------------------------

  // ---- Back legs (drawn first, behind body) --------------------------------
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;

  // Back leg (right side in side view -- further from viewer)
  const bLegActualHeight = Math.max(4, legHeight + backLegExt);
  ctx.beginPath();
  ctx.rect(backLegX, bodyBottom + bodyBob, legWidth * 0.9, bLegActualHeight);
  ctx.fill();
  ctx.stroke();

  // ---- Tail ----------------------------------------------------------------
  // Short curved tail from right edge of body
  const tailBaseX = bodyLeft + bodyWidth - 2;
  const tailBaseY = bodyTop + bodyHeight * 0.3 + bodyBob;
  ctx.beginPath();
  ctx.moveTo(tailBaseX, tailBaseY);
  // Cubic bezier for a curved tail
  ctx.quadraticCurveTo(
    tailBaseX + Math.cos(tailAngle) * 14,
    tailBaseY + Math.sin(tailAngle) * 14,
    tailBaseX + Math.cos(tailAngle) * 18,
    tailBaseY + Math.sin(tailAngle) * 18 - 6,
  );
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 3;
  ctx.stroke();

  // ---- Body ----------------------------------------------------------------
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;

  // White body rectangle
  ctx.beginPath();
  ctx.rect(bodyLeft, bodyTop + bodyBob, bodyWidth, bodyHeight);
  ctx.fill();
  ctx.stroke();

  // Body stripes (2 diagonal black stripes)
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2.5;
  const stripeCount = 2;
  for (let i = 0; i < stripeCount; i++) {
    const sx = bodyLeft + bodyWidth * (0.25 + i * 0.35);
    ctx.beginPath();
    ctx.moveTo(sx, bodyTop + bodyBob);
    ctx.lineTo(sx - 5, bodyBottom + bodyBob);
    ctx.stroke();
  }

  // ---- Front legs (drawn on top of body) -----------------------------------
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;

  const fLegActualHeight = Math.max(4, legHeight + frontLegExt);
  ctx.beginPath();
  ctx.rect(frontLegX, bodyBottom + bodyBob, legWidth, fLegActualHeight);
  ctx.fill();
  ctx.stroke();

  // ---- Head ----------------------------------------------------------------
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.arc(cx, headCY + bodyBob, headRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // ---- Head stripes (2-3 diagonal stripes on the head) --------------------
  ctx.strokeStyle = '#222222';
  ctx.lineWidth = 2;
  ctx.save();
  // Clip to head circle before drawing stripes
  ctx.beginPath();
  ctx.arc(cx, headCY + bodyBob, headRadius - 1, 0, Math.PI * 2);
  ctx.clip();

  const headStripes = [
    { x1: cx - headRadius * 0.6, x2: cx - headRadius * 0.3 },
    { x1: cx - headRadius * 0.1, x2: cx + headRadius * 0.15 },
    { x1: cx + headRadius * 0.35, x2: cx + headRadius * 0.55 },
  ];
  for (const s of headStripes) {
    ctx.beginPath();
    ctx.moveTo(s.x1, headCY + bodyBob - headRadius);
    ctx.lineTo(s.x2, headCY + bodyBob + headRadius);
    ctx.stroke();
  }
  ctx.restore();  // removes clip

  // ---- Ears (pointy triangular ears on top of head) -----------------------
  const earBaseY = headCY + bodyBob - headRadius * 0.7;
  const leftEarX  = cx - headRadius * 0.45;
  const rightEarX = cx + headRadius * 0.25;

  // Left ear
  ctx.save();
  ctx.translate(leftEarX, earBaseY);
  ctx.rotate(earTiltLeft);
  // Outer ear (white with black outline)
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-earW / 2, earH);
  ctx.lineTo(0, -earH);
  ctx.lineTo(earW / 2, earH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // Inner ear (pink accent)
  ctx.fillStyle = '#FFB6C1';
  ctx.beginPath();
  ctx.moveTo(-earW * 0.25, earH * 0.7);
  ctx.lineTo(0, -earH * 0.5);
  ctx.lineTo(earW * 0.25, earH * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Right ear
  ctx.save();
  ctx.translate(rightEarX, earBaseY);
  ctx.rotate(earTiltRight);
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-earW / 2, earH);
  ctx.lineTo(0, -earH);
  ctx.lineTo(earW / 2, earH);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#FFB6C1';
  ctx.beginPath();
  ctx.moveTo(-earW * 0.25, earH * 0.7);
  ctx.lineTo(0, -earH * 0.5);
  ctx.lineTo(earW * 0.25, earH * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // ---- Eyes (two big white circles with black pupils) ---------------------
  const eyeRadius   = headRadius * 0.22;
  const pupilRadius = eyeRadius  * 0.55;
  const eyeY        = headCY + bodyBob - headRadius * 0.15;
  const leftEyeX    = cx - headRadius * 0.32;
  const rightEyeX   = cx + headRadius * 0.32;

  // White sclera
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.arc(leftEyeX,  eyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(rightEyeX, eyeY, eyeRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Black pupils (with gaze offset for idle expression)
  ctx.fillStyle = '#111111';

  ctx.beginPath();
  ctx.arc(leftEyeX  + pupilOffX, eyeY + pupilOffY, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(rightEyeX + pupilOffX, eyeY + pupilOffY, pupilRadius, 0, Math.PI * 2);
  ctx.fill();

  // Pupil shine dots (cute white highlights)
  ctx.fillStyle = '#FFFFFF';
  const shineR = pupilRadius * 0.35;

  ctx.beginPath();
  ctx.arc(leftEyeX  + pupilOffX + pupilRadius * 0.3, eyeY + pupilOffY - pupilRadius * 0.3, shineR, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(rightEyeX + pupilOffX + pupilRadius * 0.3, eyeY + pupilOffY - pupilRadius * 0.3, shineR, 0, Math.PI * 2);
  ctx.fill();

  // ---- Nose (small pink ellipse at bottom-centre of head) -----------------
  const noseX = cx;
  const noseY = headCY + bodyBob + headRadius * 0.45;
  ctx.fillStyle = '#FFB6C1';
  ctx.beginPath();
  ctx.ellipse(noseX, noseY, headRadius * 0.12, headRadius * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();

  // ---- Restore any transforms applied above (doubleJump / run tilt) -------
  ctx.restore();
}

// ---------------------------------------------------------------------------
// Player drawing
// ---------------------------------------------------------------------------

/**
 * Draws the player using squash/stretch transform anchored at bottom-centre,
 * then delegates to drawZebraFrame for the procedural chibi zebra character.
 * Falls back to a coloured rectangle if the procedural drawing fails.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} player - Player state object (x, y, squashX, squashY, animState, animFrame)
 * @param {Object} config - Game CONFIG object
 */
export function drawPlayer(ctx, player, config) {
  ctx.save();

  // Translate to the bottom-centre of the player rectangle
  ctx.translate(player.x + config.PLAYER_WIDTH / 2, player.y + config.PLAYER_HEIGHT);

  // Apply squash/stretch scaling anchored at the bottom-centre
  ctx.scale(player.squashX, player.squashY);

  // Translate back so drawing coordinates originate at the top-left of the player box
  ctx.translate(-(config.PLAYER_WIDTH / 2), -config.PLAYER_HEIGHT);

  try {
    drawZebraFrame(ctx, config.PLAYER_WIDTH, config.PLAYER_HEIGHT, player.animState, player.animFrame);
  } catch (e) {
    // Fallback to coloured rectangle if procedural drawing fails
    ctx.fillStyle = config.PLAYER_COLOR;
    ctx.fillRect(0, 0, config.PLAYER_WIDTH, config.PLAYER_HEIGHT);
  }

  ctx.restore();
}
