
export class Score {
    constructor() {
        this.distance = 0;
        this.geneScore = 0;
        this.genesCollected = 0;
    }

    update(deltaTime, speed) {
        this.distance += speed * deltaTime;
    }

    addGene(points) {
        this.geneScore += points;
        this.genesCollected++;
    }

    draw(renderer) {
        const dist = Math.floor(this.distance / 100);
        renderer.drawText(`Distance: ${dist}m`, 20, 40, { align: 'left' });
        renderer.drawText(`Score: ${this.geneScore}`, 20, 70, { align: 'left' });
    }
    
    reset() {
        this.distance = 0;
        this.geneScore = 0;
        this.genesCollected = 0;
    }
}
