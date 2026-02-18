export default {
  // Canvas dimensions
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // Colors
  BACKGROUND_COLOR: '#1a1a2e',   // deep dark blue-black
  GROUND_COLOR: '#2C5F8A',       // medium blue-grey earth band
  TEXT_COLOR: '#FFFFFF',
  PLAYER_COLOR: '#00FF00',       // placeholder for Phase 2

  // Physics
  GRAVITY: 1800,                 // px/s^2 downward
  JUMP_VELOCITY: -650,           // px/s upward (negative = up)
  GROUND_Y: 600,                 // px from top -- ground line position, leaves room for runner

  // Speeds
  GAME_SPEED: 200,               // px/s initial horizontal scroll
  SPEED_INCREMENT: 2,            // px/s per second of acceleration (gentler ramp, ~150s to reach MAX_SPEED)
  MAX_SPEED: 500,                // px/s cap

  // Ground
  GROUND_LINE_WIDTH: 4,          // px thickness of the bright top edge
  GROUND_LINE_COLOR: '#4A90D9',  // bright blue surface line

  // Ground markers (scrolling dash markers for motion illusion)
  GROUND_MARKER_COLOR: '#3A78C2',   // slightly darker than surface line
  GROUND_MARKER_WIDTH: 20,          // px, dash width
  GROUND_MARKER_HEIGHT: 4,          // px, dash height
  GROUND_MARKER_SPACING: 100,       // px, total repeat distance (20px dash + 80px gap)
  GROUND_MARKER_Y_OFFSET: 12,       // px below GROUND_Y surface edge

  // Scroll speeds
  READY_SCROLL_SPEED: 60,        // px/s, ~30% of GAME_SPEED, slow idle hint on READY screen

  // HUD
  HUD_COLOR: '#FFD700',          // gold for distance counter
  PX_PER_METER: 10,              // 10 canvas pixels = 1 displayed meter

  // Countdown
  COUNTDOWN_STEP: 0.8,           // seconds per digit in 3-2-1-Go! countdown
  COUNTDOWN_COLOR: '#FFD700',    // gold for countdown numbers
  COUNTDOWN_GO_COLOR: '#00FF88', // green for "Go!"

  // Game over
  GAME_OVER_FREEZE_DELAY: 1.0,  // seconds of flash before showing text
  GAME_OVER_COOLDOWN: 1.0,      // seconds before Space accepted for restart
  GAME_OVER_COLOR: '#FF4444',   // red for Game Over text
  FLASH_INTERVAL: 0.1,          // seconds between flash toggles

  // Player physics tuning
  JUMP_CUT_MULTIPLIER: 0.5,     // velocity multiplier on early jump release (short hop)
  FALL_GRAVITY_MULT: 1.6,       // gravity multiplier when falling (snappier descent)
  COYOTE_TIME: 0.1,             // seconds of grace period after leaving ground
  DOUBLE_JUMP_MULT: 0.85,       // double jump is 85% of first jump velocity

  // Player dimensions and position
  PLAYER_WIDTH: 64,             // px width of player rectangle
  PLAYER_HEIGHT: 80,            // px height of player rectangle
  PLAYER_X_DEFAULT: 320,        // px ~25% of 1280px canvas width (default running position)
  PLAYER_MOVE_SPEED: 120,       // px/s horizontal movement speed
  PLAYER_MOVE_ZONE_LEFT: 160,   // px left boundary of horizontal movement zone
  PLAYER_MOVE_ZONE_RIGHT: 480,  // px right boundary of horizontal movement zone
  PLAYER_BOUNCE_FORCE: 0.6,     // velocity multiplier when hitting zone edges (soft bounce)

  // Touch tuning
  TOUCH_JUMP_SHORT_MS: 120,     // ms threshold: taps shorter than this get jump cut

  // Entity types: data-driven arrays for Phase 4+ spawning. Select by name or spawnRate, never by index.

  // Obstacle types (Phase 4) -- three visually distinct types with progressive unlocking
  OBSTACLE_TYPES: [
    {
      name: 'kidney-stone',
      displayName: 'Kidney Stone',
      width: 32,
      height: 42,
      color: '#8B6914',           // earthy brown
      hitboxShrink: 0.15,         // 15% shrink on each side
      placement: 'ground',        // sits on GROUND_Y
      floatHeight: 0,
      spawnWeight: 3,             // most common
      unlockAfter: 0,             // available from start
    },
    {
      name: 'toxin',
      displayName: 'Toxin',
      width: 28,
      height: 36,
      color: '#2E8B3A',           // mid-green
      hitboxShrink: 0.15,
      placement: 'ground',
      floatHeight: 0,
      spawnWeight: 2,
      unlockAfter: 10,            // unlocks ~10s in
    },
    {
      name: 'salt-crystal',
      displayName: 'Salt Crystal',
      width: 24,
      height: 52,                 // tall
      color: '#B0C8E0',           // white/light-blue
      hitboxShrink: 0.20,         // more forgiving for tall obstacle
      placement: 'floating',
      floatHeight: 120,           // px above GROUND_Y -- at jump apex
      spawnWeight: 1,
      unlockAfter: 20,            // unlocks ~20s in
    },
  ],

  // Gene types (Phase 5) -- three distinct collectible types with full educational fields
  GENE_TYPES: [
    {
      name: 'PKD1',
      color: '#4CAF50',
      points: 10,
      width: 30,
      height: 30,
      diseaseName: 'Autosomal Dominant Polycystic Kidney Disease (ADPKD)',
      description: 'Encodes Polycystin-1, a membrane receptor controlling kidney tubule development. Mutations cause fluid-filled cysts that progressively replace kidney tissue.',
      inheritance: 'Autosomal dominant (50% transmission risk)',
      omimId: '173900',
      omimUrl: 'https://omim.org/entry/173900',
      geneReviewsUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK1246/',
    },
    {
      name: 'COL4A5',
      color: '#2196F3',
      points: 15,
      width: 30,
      height: 30,
      diseaseName: 'Alport Syndrome (X-linked)',
      description: 'Encodes Collagen IV alpha-5, a key component of the glomerular basement membrane. Mutations cause progressive kidney failure, hearing loss, and eye abnormalities.',
      inheritance: 'X-linked (males severely affected; females variable)',
      omimId: '301050',
      omimUrl: 'https://omim.org/entry/301050',
      geneReviewsUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK1207/',
    },
    {
      name: 'NPHS1',
      color: '#FF9800',
      points: 20,
      width: 30,
      height: 30,
      diseaseName: 'Congenital Nephrotic Syndrome (Finnish type)',
      description: 'Encodes Nephrin, the structural protein of the slit diaphragm. Loss of function causes massive protein leakage from birth.',
      inheritance: 'Autosomal recessive (both copies must be mutated)',
      omimId: '256300',
      omimUrl: 'https://omim.org/entry/256300',
      geneReviewsUrl: 'https://www.ncbi.nlm.nih.gov/books/NBK1484/',
    },
  ],

  // -- Spawn timing (Phase 4) --
  SPAWN_BASE_INTERVAL: 2.0,       // seconds between spawns
  SPAWN_INTERVAL_VARIATION: 0.6,  // +/- random variation in seconds
  FLOAT_UNLOCK_ELAPSED: 15,       // seconds before floating obstacles can appear

  // -- Cluster spawning (Phase 4) --
  CLUSTER_PROBABILITY: 0.25,      // 25% chance a spawn triggers a cluster
  CLUSTER_SIZE_MAX: 3,            // max obstacles in a cluster
  CLUSTER_GAP: 180,               // px gap between cluster members

  // -- Hitbox (Phase 4) --
  PLAYER_HITBOX_SHRINK: 0.15,     // player collision box shrink (same 15%)

  // -- Death animation (Phase 4) --
  DEATH_ANIMATION_DURATION: 0.5,  // seconds of flash + shake before game over
  DEATH_FLASH_INTERVAL: 0.08,     // seconds per flash on/off toggle
  DEATH_SHAKE_DURATION: 0.4,      // seconds of screen shake within death window
  SHAKE_AMPLITUDE: 8,             // px max shake offset

  // -- Near-miss (Phase 4) --
  NEAR_MISS_FLASH_COLOR: '#FFFF44',  // yellow flash
  NEAR_MISS_FLASH_DURATION: 0.15,    // seconds of near-miss flash

  // -- Game over overlay (Phase 4) --
  GAME_OVER_OVERLAY_ALPHA: 0.72,     // overlay darkness

  // -- Collectible spawning (Phase 5) --
  COLLECTIBLE_SPAWN_BASE_INTERVAL: 3.5,   // seconds between gene spawns
  COLLECTIBLE_SPAWN_VARIATION: 1.5,       // +/- seconds of randomness (yields 2-5s intervals)
  COLLECTIBLE_FLOAT_AMPLITUDE: 8,         // px half peak-to-peak float
  COLLECTIBLE_FLOAT_FREQ: 2.0,            // Hz (cycles per second)

  // -- Risk-reward spawning (Phase 5) --
  RISK_SPAWN_PROBABILITY: 0.25,           // 25% chance a gene spawns within 1s of an obstacle

  // -- Restart (Phase 5) --
  RESTART_COOLDOWN: 1.5,                  // seconds before Space is accepted on game over screen

  // -- Gene name flash (Phase 5) --
  GENE_LABEL_FLASH_DURATION: 1.0,         // seconds the gene name appears near HUD on pickup
};
