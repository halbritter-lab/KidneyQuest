import { Game } from './game.js';
import { GAME_WIDTH, GAME_HEIGHT } from './config.js';

console.log('KidneyQuest starting...');

const canvas = document.getElementById('game-canvas');

// Basic responsive scaling
function resizeCanvas() {
  const scale = Math.min(
    window.innerWidth / GAME_WIDTH,
    window.innerHeight / GAME_HEIGHT
  );
  canvas.style.width = `${GAME_WIDTH * scale}px`;
  canvas.style.height = `${GAME_HEIGHT * scale}px`;
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas(); // Initial call

const game = new Game(canvas);
window.game = game;
game.start();
