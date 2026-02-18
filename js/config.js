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
