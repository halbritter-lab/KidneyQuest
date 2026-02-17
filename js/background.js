import { GAME_WIDTH, GAME_HEIGHT, GROUND_Y } from './config.js';

export class Background {
    constructor() {
        this.groundOffset = 0;
        this.groundColor = '#888'; 
    }

    update(speed, deltaTime) {
        // Scroll ground
        this.groundOffset -= speed * deltaTime;
        // Reset when a full segment (50px) has scrolled
        if (this.groundOffset <= -50) {
            this.groundOffset += 50;
        }
    }

    draw(ctx) {
        // Draw Sky Gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
        // Darkish nice gradient
        gradient.addColorStop(0, '#1a2a6c');  
        gradient.addColorStop(0.5, '#b21f1f');
        gradient.addColorStop(1, '#fdbb2d');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

        // Draw Ground Line
        ctx.strokeStyle = this.groundColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, GROUND_Y);
        ctx.lineTo(GAME_WIDTH, GROUND_Y);
        ctx.stroke();

        // Draw Scrolling Markers
        ctx.beginPath();
        for (let x = this.groundOffset; x < GAME_WIDTH; x += 50) {
            // Only draw if within bounds (accounting for margin)
            ctx.moveTo(x, GROUND_Y);
            ctx.lineTo(x - 20, GROUND_Y + 30); // Diagonal hatch marks
        }
        ctx.stroke();
    }
}
