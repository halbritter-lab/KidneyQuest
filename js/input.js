export class InputHandler {
    constructor() {
        this.keys = {};
        this.touchActive = false;
        this.callbacks = [];

        window.addEventListener('keydown', (e) => {
            // Prevent scrolling for game keys
            if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) {
                // e.preventDefault(); 
            }
            
            if (!this.keys[e.code]) {
                if (['Space', 'ArrowUp'].includes(e.code)) {
                    this.jumpRequested = true;
                }
            }
            
            this.keys[e.code] = true;
            console.log('Key down:', e.code);
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
            console.log('Key up:', e.code);
        });

        window.addEventListener('touchstart', (e) => {
            this.touchActive = true;
            this.jumpRequested = true;
            console.log('Touch start');
        });

        window.addEventListener('touchend', (e) => {
            this.touchActive = false;
            console.log('Touch end');
        });
    }

    isJumpPressed() {
        return this.keys['Space'] || this.keys['ArrowUp'] || this.touchActive;
    }

    consumeJump() {
        const jumped = this.jumpRequested || (this.keys['Space'] && !this.prevSpace) || (this.keys['ArrowUp'] && !this.prevUp);
        // We need to track previous state to detect "just pressed" if we don't use the event listener properly
        // Actually, let's just rely on the event listener setting jumpRequested.
        if (this.jumpRequested) {
            this.jumpRequested = false;
            return true;
        }
        return false;
    }
}
