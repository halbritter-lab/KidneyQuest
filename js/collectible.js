import { GENE_TYPES, GAME_WIDTH } from './config.js';
import { checkCollision } from './collision.js';

class Gene {
    constructor(type, x, y) {
        this.type = type;
        this.x = x;
        this.y = y;
        this.width = 30;
        this.height = 30;
        this.color = type.color;
        this.points = type.points;
        this.markedForDeletion = false;
        this.floatOffset = Math.random() * Math.PI * 2;
    }

    update(speed, deltaTime) {
        this.x -= speed * deltaTime;
        
        // Float animation
        this.floatOffset += deltaTime * 3;
        // Move Y slightly
        this.y += Math.sin(this.floatOffset) * 0.5;

        if (this.x + this.width + 50 < 0) this.markedForDeletion = true;
    }

    draw(ctx) {
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x + this.width/2, this.y + this.height/2, this.width/2, 0, Math.PI * 2);
        ctx.fill();
        
        // Label
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.type.name, this.x + this.width/2, this.y + this.height + 14);
    }
}

export class CollectibleManager {
    constructor() {
        this.genes = [];
        this.spawnTimer = 0;
    }
    
    update(speed, deltaTime, player, onCollect) {
        this.spawnTimer -= deltaTime;
        if (this.spawnTimer <= 0) {
            this.spawn();
            this.spawnTimer = 2 + Math.random() * 3; // Every 2-5 seconds
        }

        this.genes.forEach(gene => {
            gene.update(speed, deltaTime);
            if (checkCollision(player, gene)) { // Basic AABB, treats circle as square
                onCollect(gene);
                gene.markedForDeletion = true;
            }
        });

        this.genes = this.genes.filter(g => !g.markedForDeletion);
    }

    draw(ctx) {
        this.genes.forEach(g => g.draw(ctx));
    }

    spawn() {
        const type = GENE_TYPES[Math.floor(Math.random() * GENE_TYPES.length)];
        // Floating height: reachable by jump or sometimes on ground?
        // Let's spawn at varying heights. 
        // Ground Y ~320. Max Jump Y ~200.
        // Spawn Y: 220 to 280
        const y = 220 + Math.random() * 60;
        this.genes.push(new Gene(type, GAME_WIDTH, y));
    }

    reset() {
        this.genes = [];
        this.spawnTimer = 0;
    }
}
