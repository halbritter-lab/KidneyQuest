import { GAME_WIDTH, GAME_HEIGHT } from './config.js';

export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        // Set internal resolution
        this.canvas.width = GAME_WIDTH;
        this.canvas.height = GAME_HEIGHT;
    }

    clear() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    draw(entity) {
        if (entity && typeof entity.draw === 'function') {
            entity.draw(this.ctx);
        }
    }

    drawRect(x, y, width, height, color) {
        this.ctx.fillStyle = color;
        this.ctx.fillRect(x, y, width, height);
    }

    drawText(text, x, y, options = {}) {
        this.ctx.save();
        this.ctx.font = options.font || '20px Arial';
        this.ctx.fillStyle = options.color || 'white';
        this.ctx.textAlign = options.align || 'center';
        this.ctx.fillText(text, x, y);
        this.ctx.restore();
    }
}
