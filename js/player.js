import { GRAVITY, JUMP_VELOCITY, GROUND_Y } from './config.js';

export class Player {
    constructor() {
        this.width = 50; 
        this.height = 50;
        this.x = 100; // Fixed x position
        this.y = GROUND_Y - this.height;
        this.velocityY = 0;
        this.isGrounded = true;
        this.color = '#fff'; // Fallback color
        
        this.image = new Image();
        this.imageLoaded = false;
        this.image.onload = () => {
            this.imageLoaded = true;
            console.log('Zebra sprite loaded successfully');
        };
        this.image.onerror = (e) => {
            console.error('Failed to load zebra sprite', e);
        };
        // Add cache buster to ensure fresh load
        this.image.src = 'assets/sprites/zebra.png?v=' + Date.now();
    }

    update(deltaTime, input) {
        // Simple jump check
        if (input.isJumpPressed() && this.isGrounded) {
            this.jump();
        }

        // Apply gravity
        this.velocityY += GRAVITY * deltaTime;
        this.y += this.velocityY * deltaTime;

        // Ground collision
        const groundLevel = GROUND_Y - this.height;
        if (this.y >= groundLevel) {
            this.y = groundLevel;
            this.velocityY = 0;
            this.isGrounded = true;
        } else {
            this.isGrounded = false;
        }
    }

    jump() {
        this.velocityY = JUMP_VELOCITY;
        this.isGrounded = false;
    }

    draw(ctx) {
        if (this.imageLoaded) {
            // Draw sprite slightly larger than hitbox to account for whitespace in sprite
            // Hitbox is 50x50. Sprite is 64x64 canvas with ~48x52 content.
            // Let's center it.
            const drawSize = 70;
            const drawX = this.x - (drawSize - this.width) / 2;
            // Align bottom of sprite with bottom of hitbox (ground)
            const drawY = this.y + this.height - drawSize;
            ctx.drawImage(this.image, drawX, drawY, drawSize, drawSize);
            
            // Debug Hitbox
            // ctx.strokeStyle = 'rgba(255, 0, 0, 0.5)';
            // ctx.strokeRect(this.x, this.y, this.width, this.height);
        } else {
            // Fallback rectangle
            ctx.fillStyle = this.color;
            ctx.save();
            ctx.fillRect(this.x, this.y, this.width, this.height);
            ctx.restore();
        }
    }
}
