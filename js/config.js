export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 400;

export const GRAVITY = 1800;          // px/s² downward
export const JUMP_VELOCITY = -650;    // px/s upward (negative = up)
export const GROUND_Y = 320;          // px from top
export const GAME_SPEED = 200;        // px/s initial horizontal scroll
export const SPEED_INCREMENT = 5;     // px/s per second
export const MAX_SPEED = 500;         // px/s cap

export const OBSTACLE_TYPES = [
  { name: 'kidney-stone', width: 30, height: 40, color: '#8B7355' },
  { name: 'blockage',     width: 50, height: 30, color: '#A0522D' },
];

export const GENE_TYPES = [
  { name: 'PKD1',   color: '#4CAF50', points: 10 }, // Green
  { name: 'COL4A5', color: '#2196F3', points: 15 }, // Blue
  { name: 'NPHS1',  color: '#FF9800', points: 20 }, // Orange
];
