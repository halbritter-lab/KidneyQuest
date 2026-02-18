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
  SPEED_INCREMENT: 5,            // px/s per second of acceleration
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

  // Obstacle types (for Phase 4+)
  OBSTACLE_TYPES: [
    { name: 'kidney-stone', width: 30, height: 40, color: '#C4A35A', spawnRate: 1.0, movement: 'static' },
    { name: 'blockage',     width: 50, height: 30, color: '#8B4513', spawnRate: 0.7, movement: 'static' },
    { name: 'cyst',         width: 35, height: 35, color: '#9B59B6', spawnRate: 0.5, movement: 'float'  },
  ],

  // Gene types (for Phase 4+)
  GENE_TYPES: [
    {
      name: 'PKD1', geneName: 'Polycystin-1',
      geneDescription: 'Helps kidneys develop properly. Mutations cause cysts, leading to polycystic kidney disease.',
      color: '#E74C3C', points: 10, spawnRate: 1.0, movement: 'float',
    },
    {
      name: 'PKD2', geneName: 'Polycystin-2',
      geneDescription: 'Works with PKD1 to keep kidneys healthy. PKD2 mutations cause a milder polycystic kidney disease.',
      color: '#E67E22', points: 10, spawnRate: 1.0, movement: 'float',
    },
    {
      name: 'COL4A5', geneName: 'Collagen IV Alpha-5',
      geneDescription: 'Builds the kidney filter membrane. Mutations cause Alport syndrome with kidney failure and hearing loss.',
      color: '#3498DB', points: 15, spawnRate: 0.8, movement: 'float',
    },
    {
      name: 'NPHS1', geneName: 'Nephrin',
      geneDescription: 'Forms the kidney\'s finest filter barrier. Mutations cause congenital nephrotic syndrome from birth.',
      color: '#2ECC71', points: 20, spawnRate: 0.6, movement: 'float',
    },
    {
      name: 'NPHS2', geneName: 'Podocin',
      geneDescription: 'Anchors the nephrin filter in place. Mutations cause steroid-resistant nephrotic syndrome in children.',
      color: '#F1C40F', points: 20, spawnRate: 0.6, movement: 'float',
    },
    {
      name: 'WT1', geneName: 'Wilms Tumor Protein 1',
      geneDescription: 'Controls kidney development. Mutations cause Wilms tumor (kidney cancer) and nephrotic syndrome.',
      color: '#9B59B6', points: 25, spawnRate: 0.4, movement: 'float',
    },
  ],
};
