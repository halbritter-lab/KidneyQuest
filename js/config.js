export default {
  // Canvas dimensions
  CANVAS_WIDTH: 1280,
  CANVAS_HEIGHT: 720,

  // Colors
  BACKGROUND_COLOR: '#1a1a2e',   // deep dark blue-black
  GROUND_COLOR: '#333355',       // subtle ground line, slightly lighter than background
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
  GROUND_LINE_WIDTH: 2,          // px thickness of the bright top edge
  GROUND_LINE_COLOR: '#555577',  // brighter top edge of the ground

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

  // Obstacle types (for Phase 4+)
  OBSTACLE_TYPES: [
    { name: 'kidney-stone', width: 30, height: 40, color: '#8B7355' },
    { name: 'blockage',     width: 50, height: 30, color: '#A0522D' },
  ],

  // Gene types (for Phase 4+)
  GENE_TYPES: [
    { name: 'PKD1',   color: '#4CAF50', points: 10 }, // Green
    { name: 'COL4A5', color: '#2196F3', points: 15 }, // Blue
    { name: 'NPHS1',  color: '#FF9800', points: 20 }, // Orange
  ],
};
