# KidneyQuest - Development Plan

## Executive Summary
KidneyQuest is a browser-based educational game designed as a teaching tool for the AI-Teachathon workshop at CeRKiD (Center for Rare Kidney Diseases, Charité Berlin). The game features a side-scrolling runner starring the CeRKiD zebra mascot, collecting genes in a kidney-themed environment.

**Primary Goal:** Enable workshop participants to learn Git workflow (fork, clone, branch, code with AI, commit, push, PR) through real-world contributions.

**Technical Constraint:** Pure vanilla JavaScript with HTML5 Canvas - zero dependencies, no build tools, no frameworks.

---

## 1. Project Architecture

### 1.1 File Structure
```
KidneyQuest/
├── index.html              # Entry point
├── styles/
│   └── main.css           # Minimal styling
├── js/
│   ├── game.js            # Main game loop
│   ├── player.js          # Zebra character logic
│   ├── obstacle.js        # Obstacle management
│   ├── collectible.js     # Gene collectibles
│   ├── background.js      # Parallax background layers
│   ├── physics.js         # Jump/gravity physics
│   ├── collision.js       # Collision detection
│   ├── score.js           # Scoring system
│   └── ui.js              # Score display, game over screen
├── assets/
│   ├── images/
│   │   ├── zebra/         # Character sprites
│   │   ├── obstacles/     # Obstacle sprites
│   │   ├── collectibles/  # Gene sprites
│   │   └── backgrounds/   # Background elements
│   └── sounds/            # (Optional) Audio files
├── .planning/
│   ├── ideat.txt
│   └── development-plan.md
└── README.md
```

### 1.2 Core Game Components

**Game Loop (game.js)**
- Manages game state (menu, playing, paused, game over)
- Coordinates update and render cycles (requestAnimationFrame)
- Handles timing and difficulty scaling

**Player (player.js)**
- Zebra character state and rendering
- Animation states (running, jumping, falling)
- Input handling (spacebar/click to jump)

**Physics (physics.js)**
- Gravity simulation
- Jump velocity and arc calculation
- Ground collision

**Obstacle Manager (obstacle.js)**
- Spawns obstacles at intervals
- Manages obstacle pool for performance
- Different obstacle types (rocks, barriers, etc.)

**Collectible Manager (collectible.js)**
- Spawns genes at intervals
- Different gene types (possibly weighted rarity)
- Collection effects

**Background (background.js)**
- Multi-layer parallax scrolling
- Kidney-themed environment (nephrons, cells, etc.)
- Cloud/particle effects

**Collision Detection (collision.js)**
- AABB (Axis-Aligned Bounding Box) collision
- Pixel-perfect collision for advanced features
- Separation of deadly vs collectible collisions

**Score & UI (score.js, ui.js)**
- Distance-based scoring
- Gene collection bonuses
- High score persistence (localStorage)
- Game over screen with statistics

---

## 2. Development Phases

### Phase 1: MVP Foundation (Week 1)
**Goal:** Playable core loop

**Tasks:**
1. Create basic HTML5 Canvas setup
2. Implement game loop with requestAnimationFrame
3. Create simple zebra sprite (can be placeholder rectangle initially)
4. Implement basic jump physics (gravity + jump impulse)
5. Add ground collision detection
6. Create single obstacle type
7. Implement obstacle spawning and scrolling
8. Add basic collision detection (game over on hit)
9. Simple score counter (distance-based)

**Deliverable:** A playable endless runner where zebra jumps over obstacles

### Phase 2: Core Features (Week 2)
**Goal:** Complete game mechanics

**Tasks:**
1. Add gene collectibles with collection logic
2. Implement multiple obstacle types
3. Create parallax background system (2-3 layers)
4. Add sprite animations for zebra (running, jumping)
5. Improve jump physics (variable jump height based on press duration)
6. Add difficulty scaling (speed increases over time)
7. Create game over screen with restart button
8. Implement high score system with localStorage

**Deliverable:** Full-featured game with polished mechanics

### Phase 3: Visual Polish & Theme (Week 3)
**Goal:** Kidney/genetics theme integration

**Tasks:**
1. Create or source kidney-themed backgrounds
   - Nephron structures
   - Cell membranes
   - Blood vessel networks
2. Design gene sprites (DNA helixes, chromosomes)
3. Create obstacle sprites (kidney stones, barriers)
4. Refine zebra character art
5. Add particle effects (dust when landing, sparkles on collection)
6. Implement color scheme (medical/scientific palette)
7. Add smooth transitions and animations

**Deliverable:** Visually coherent kidney/genetics theme

### Phase 4: Workshop Preparation (Week 4)
**Goal:** Optimize for educational use

**Tasks:**
1. Code refactoring for readability
   - Clear variable names
   - Extensive comments explaining game logic
   - Modular function structure
2. Create comprehensive README with:
   - Game description
   - Setup instructions
   - Code structure explanation
   - Contribution guidelines
3. Set up GitHub Issues for workshop tasks:
   - Label issues by difficulty (beginner, intermediate, advanced)
   - Write clear acceptance criteria
   - Add code hints/pointers
4. Create contribution templates
5. Add code of conduct
6. Test on multiple browsers

**Deliverable:** Workshop-ready repository

---

## 3. Workshop Issue Ideas

### Beginner Issues
1. **Add new obstacle type** - Duplicate existing obstacle with different sprite
2. **Change jump height** - Modify single gravity constant
3. **Add background color** - CSS/canvas fill change
4. **Increase game speed** - Adjust scrolling multiplier
5. **Add new gene type** - Duplicate collectible with different color

### Intermediate Issues
1. **Implement cloud parallax layer** - New background layer class
2. **Add combo scoring** - Consecutive collections increase multiplier
3. **Create pause functionality** - Game state management
4. **Add sound effects** - HTML5 Audio API integration
5. **Implement sprite animation** - Frame-based animation system

### Advanced Issues
1. **Add power-ups** (invincibility, magnet, double points)
2. **Create procedural obstacle patterns** - Pattern generation algorithm
3. **Implement leaderboard** - LocalStorage management with sorting
4. **Add mobile touch controls** - Touch event handling
5. **Create level system** - Progressive difficulty with checkpoints

---

## 4. Technical Specifications

### 4.1 Canvas Configuration
```javascript
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 400;
const FPS = 60;
```

### 4.2 Physics Constants
```javascript
const GRAVITY = 0.6;           // Pixels per frame²
const JUMP_VELOCITY = -12;     // Initial upward velocity
const MAX_FALL_SPEED = 15;     // Terminal velocity
const GROUND_Y = 320;          // Ground level
```

### 4.3 Game Balance
```javascript
const INITIAL_SPEED = 3;       // Pixels per frame
const SPEED_INCREMENT = 0.002; // Speed increase per frame
const MAX_SPEED = 8;           // Speed cap

const OBSTACLE_SPAWN_RATE = 120;  // Frames between obstacles
const GENE_SPAWN_RATE = 200;      // Frames between genes

const DISTANCE_POINTS = 1;     // Points per frame survived
const GENE_POINTS = 10;        // Points per gene collected
```

### 4.4 Browser Compatibility
- Target: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- Fallback: Display message for unsupported browsers
- No transpilation needed (vanilla ES6+ is well-supported)

---

## 5. Code Style Guidelines

### 5.1 Naming Conventions
- **Classes:** PascalCase (`class Player {}`)
- **Functions:** camelCase (`function updateGame() {}`)
- **Constants:** UPPER_SNAKE_CASE (`const MAX_SPEED = 8;`)
- **Variables:** camelCase (`let currentScore = 0;`)

### 5.2 File Organization
- One class per file
- Clear module pattern using vanilla JS
- Comments explaining game logic for beginners

### 5.3 Comment Standards
```javascript
// Beginner-friendly comments explaining WHY, not just WHAT
// Good: "Increase speed over time to make game progressively harder"
// Bad: "Increment speed variable"
```

---

## 6. Asset Requirements

### 6.1 Graphics
**Zebra Character:**
- Sprite sheet: 64x64px frames
- States: idle, run (4 frames), jump, fall
- Style: Cartoony, approachable

**Obstacles:**
- Kidney stone variants (3-4 types)
- Different heights/widths
- Size range: 32x32 to 64x96

**Collectibles:**
- Gene/DNA symbols
- Glowing/animated effect preferred
- Size: 24x24 to 32x32

**Backgrounds:**
- Layer 1 (far): Kidney outline silhouette
- Layer 2 (mid): Nephron structures
- Layer 3 (near): Cell details
- Each layer scrolls at different speed

### 6.2 Audio (Optional)
- Jump sound: Short whoosh
- Collection sound: Positive chime
- Collision sound: Soft bump
- Background music: Optional looping track

---

## 7. Testing Strategy

### 7.1 Manual Testing Checklist
- [ ] Jump mechanics feel responsive
- [ ] Collision detection is accurate (no false positives/negatives)
- [ ] Game runs at 60 FPS on target browsers
- [ ] Score persists across sessions
- [ ] Game is playable from start to game over
- [ ] All assets load correctly
- [ ] Responsive to different screen sizes (within reason)

### 7.2 Edge Cases
- Rapid jump inputs
- Browser tab backgrounding (pause game)
- Window resize during gameplay
- localStorage full/unavailable
- Missing asset files

---

## 8. Documentation Requirements

### 8.1 README.md Structure
1. Game description and purpose
2. Visual preview (screenshot/GIF)
3. How to play
4. Running the game locally
5. Project structure explanation
6. Contributing guide
7. Workshop information
8. Credits and license

### 8.2 Code Documentation
- JSDoc comments for all public functions
- Inline comments for complex game logic
- Architecture decision records in `.planning/`

---

## 9. Git Workflow for Workshop

### 9.1 Branch Strategy
- `main` - Stable production version
- `develop` - Integration branch
- `feature/*` - Participant contributions

### 9.2 Issue Template
```markdown
## Description
[Clear description of feature/bug]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Hints
- File to modify: `js/player.js`
- Look at function: `handleJump()`
- Related concepts: gravity, velocity

## Difficulty
🟢 Beginner / 🟡 Intermediate / 🔴 Advanced
```

### 9.3 Pull Request Guidelines
- Require descriptive titles
- Template includes: What changed, Why, Testing done
- Encourage screenshots for visual changes

---

## 10. Performance Considerations

### 10.1 Optimization Strategies
- Object pooling for obstacles/collectibles (avoid GC pauses)
- Layer caching for backgrounds
- Limit particle effects count
- RequestAnimationFrame with delta time
- Offscreen canvas for sprite rendering

### 10.2 Memory Management
```javascript
// Object pool pattern example
const obstaclePool = {
  objects: [],
  get() {
    return this.objects.pop() || new Obstacle();
  },
  release(obj) {
    obj.reset();
    this.objects.push(obj);
  }
};
```

---

## 11. Accessibility Considerations

Even with game constraints, consider:
- High contrast mode option
- Keyboard controls (spacebar, Enter for restart)
- Screen reader announcement for game start/over
- Pause functionality (P key or Esc)
- Clear visual feedback for all actions

---

## 12. Future Enhancements (Post-Workshop)

Ideas to evolve the project:
1. **Mobile version** - Touch controls, responsive canvas
2. **Multiplayer mode** - Race against ghost recordings
3. **Level editor** - Community-created obstacle patterns
4. **Achievement system** - Unlock character skins
5. **Educational mode** - Pop-up facts about kidney diseases when collecting genes
6. **Analytics** - Track which obstacles are hardest
7. **Procedural generation** - Infinite unique levels
8. **Web Components** - Encapsulate game as reusable component

---

## 13. Success Metrics

### Workshop Success
- [ ] 80%+ of participants complete their first PR
- [ ] Issues are clearly understood without extensive help
- [ ] Code remains beginner-friendly after contributions
- [ ] All PRs merge without breaking the game

### Game Success
- [ ] Fun to play for 2+ minutes
- [ ] Clear difficulty progression
- [ ] Theme is recognizable and appropriate
- [ ] Runs smoothly in all target browsers
- [ ] Code is educational and inspirable

---

## 14. Timeline Summary

| Week | Phase | Deliverable |
|------|-------|-------------|
| 1 | MVP Foundation | Playable runner prototype |
| 2 | Core Features | Complete game mechanics |
| 3 | Visual Polish | Kidney-themed graphics |
| 4 | Workshop Prep | Ready for participants |

**Total Development Time:** ~4 weeks (part-time)

---

## 15. Resources & References

### Learning Resources for Participants
- MDN Canvas Tutorial: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial
- JavaScript.info: https://javascript.info/
- Game Loop Pattern: https://gameprogrammingpatterns.com/game-loop.html

### Asset Sources
- OpenGameArt.org - Free game sprites
- Kenney.nl - Free game assets
- Freesound.org - Free audio samples
- (Or commission custom zebra artwork)

### Inspiration
- Chrome Dino Game (the gold standard)
- Flappy Bird (simple but addictive)
- Jetpack Joyride (collectibles + obstacles)

---

## Appendix: Quick Start Implementation Order

For fastest path to playable game:

1. ✅ Create `index.html` with canvas element
2. ✅ Set up game loop in `game.js`
3. ✅ Draw zebra rectangle and ground line
4. ✅ Implement jump (spacebar + gravity)
5. ✅ Create obstacle array and spawn logic
6. ✅ Add scrolling (move obstacles left)
7. ✅ Implement collision detection
8. ✅ Add game over and restart
9. ✅ Display score
10. ✅ Replace rectangles with sprites

This order prioritizes functionality over aesthetics, allowing early playtesting.

---

**Document Version:** 1.0  
**Last Updated:** February 17, 2026  
**Author:** Senior Web Game Developer  
**Project:** KidneyQuest (github.com/berntpopp/KidneyQuest)
