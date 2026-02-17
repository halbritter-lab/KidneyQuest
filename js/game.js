import { GAME_WIDTH, GAME_HEIGHT, GAME_SPEED, SPEED_INCREMENT, MAX_SPEED } from './config.js';
import { Player } from './player.js';
import { InputHandler } from './input.js';
import { Background } from './background.js';
import { Renderer } from './renderer.js';
import { ObstacleManager } from './obstacle.js';
import { CollectibleManager } from './collectible.js';
import { Score } from './score.js';

export class Game {
    constructor(canvas) {
        this.renderer = new Renderer(canvas);
        this.input = new InputHandler();
        this.player = new Player();
        this.background = new Background();
        this.obstacleManager = new ObstacleManager();
        this.collectibleManager = new CollectibleManager();
        this.score = new Score();
        
        this.state = 'READY'; // READY, RUNNING, GAME_OVER
        this.gameSpeed = GAME_SPEED;
        
        this.lastTime = 0;
        this.loop = this.loop.bind(this);
    }

    start() {
        requestAnimationFrame(this.loop);
    }

    loop(timestamp) {
        const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.1);
        this.lastTime = timestamp;

        this.update(deltaTime);
        this.render();

        requestAnimationFrame(this.loop);
    }

    update(deltaTime) {
        if (this.state === 'READY') {
            if (this.input.consumeJump()) {
                this.state = 'RUNNING';
            }
        } else if (this.state === 'RUNNING') {
            this.gameSpeed = Math.min(this.gameSpeed + SPEED_INCREMENT * deltaTime, MAX_SPEED);
            
            this.background.update(this.gameSpeed, deltaTime);
            this.player.update(deltaTime, this.input);
            this.score.update(deltaTime, this.gameSpeed);
            
            this.obstacleManager.update(this.gameSpeed, deltaTime, this.player, () => {
                this.gameOver();
            });
            
            this.collectibleManager.update(this.gameSpeed, deltaTime, this.player, (gene) => {
                this.score.addGene(gene.points);
                // Could play sound here later
            });
            
        } else if (this.state === 'GAME_OVER') {
            if (this.input.consumeJump()) {
                this.reset();
            }
        }
    }

    gameOver() {
        this.state = 'GAME_OVER';
    }

    render() {
        this.renderer.clear();
        
        this.background.draw(this.renderer.ctx); 
        this.collectibleManager.draw(this.renderer.ctx);
        this.obstacleManager.draw(this.renderer.ctx);
        
        this.player.draw(this.renderer.ctx);

        // Score is drawn in running, and maybe shown in game over differently?
        // Prompt asks for score display during gameplay.
        // And game over screen with score.
        
        if (this.state === 'RUNNING') {
            this.score.draw(this.renderer);
        }

        // UI Overlay
        if (this.state === 'READY') {
            this.renderer.drawText('KidneyQuest', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, { font: '40px Arial', color: '#4CAF50' });
            this.renderer.drawText('Press Space to Start', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 20);
        } else if (this.state === 'GAME_OVER') {
            this.renderer.drawText('GAME OVER', GAME_WIDTH / 2, GAME_HEIGHT / 2 - 40, { color: 'red', font: '40px Arial' });
            this.renderer.drawText(`Gene Score: ${this.score.geneScore}`, GAME_WIDTH / 2, GAME_HEIGHT / 2);
            this.renderer.drawText(`Distance: ${Math.floor(this.score.distance / 100)}m`, GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30);
            this.renderer.drawText('Press Space to Restart', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 80);
        }
    }

    reset() {
        this.state = 'READY';
        this.gameSpeed = GAME_SPEED;
        this.player = new Player();
        this.background = new Background();
        this.obstacleManager.reset();
        this.collectibleManager.reset();
        this.score.reset();
    }
}

