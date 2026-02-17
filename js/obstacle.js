import { OBSTACLE_TYPES, GAME_WIDTH, GROUND_Y } from './config.js';
import { checkCollision } from './collision.js';

class Obstacle {
    constructor(type, x) {
        this.type = type;
        this.x = x;
        this.y = GROUND_Y - type.height;
        this.width = type.width;
        this.height = type.height;
        this.color = type.color;
        this.markedForDeletion = false;
    }

    update(speed, deltaTime) {
        this.x -= speed * deltaTime;
        if (this.x + this.width < 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }
}

export class ObstacleManager {
    constructor() {
        this.obstacles = [];
        this.spawnTimer = 0;
        this.spawnIntervalMin = 1.2;
        this.spawnIntervalMax = 2.5;
    }

    update(speed, deltaTime, player, onCollision) {
        // Spawning
        this.spawnTimer -= deltaTime;
        if (this.spawnTimer <= 0) {
            this.spawn();
            this.spawnTimer = this.spawnIntervalMin + Math.random() * (this.spawnIntervalMax - this.spawnIntervalMin);
            // Decrease interval slightly as speed increases could be added here
        }

        // Update and check collisions
        this.obstacles.forEach(obstacle => {
            obstacle.update(speed, deltaTime);
            if (checkCollision(player, obstacle, 4)) {
                onCollision();
            }
        });

        // Cleanup
        this.obstacles = this.obstacles.filter(o => !o.markedForDeletion);
    }

    draw(ctx) {
        this.obstacles.forEach(o => o.draw(ctx));
    }

    spawn() {
        const type = OBSTACLE_TYPES[Math.floor(Math.random() * OBSTACLE_TYPES.length)];
        this.obstacles.push(new Obstacle(type, GAME_WIDTH));
    }

    reset() {
        this.obstacles = [];
        this.spawnTimer = 0;
    }
}
