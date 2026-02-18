// Playwright automated verification for Phase 5: Collectibles + Scoring
// Tests gene spawning, floating animation, collection, scoring, HUD, popups,
// gene flash, difficulty ramp, educational game over screen, high score, restart.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = './.playwright/phase5';
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const PORT = 8099;
const URL = `http://localhost:${PORT}`;

// ---------------------------------------------------------------------------
// Minimal static file server
// ---------------------------------------------------------------------------
const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.css':  'text/css',
  '.png':  'image/png',
  '.json': 'application/json',
};

const ROOT = path.resolve('.');

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = path.join(ROOT, req.url === '/' ? 'index.html' : req.url);
      const ext = path.extname(filePath);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(PORT, () => {
      console.log(`  Static server on ${URL}`);
      resolve(server);
    });
  });
}

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------
let passed = 0;
let failed = 0;
const issues = [];

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`  PASS  ${label}`);
    passed++;
  } else {
    const msg = detail ? `${label} -- ${detail}` : label;
    console.log(`  FAIL  ${label}${detail ? ' (' + detail + ')' : ''}`);
    issues.push(msg);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Helper: start game and get to RUNNING state
// ---------------------------------------------------------------------------
async function startGame(page) {
  await page.focus('#game-canvas');
  await page.keyboard.press('Space');
  // Wait for countdown to complete (~3.2s for 3-2-1-Go!)
  await page.waitForTimeout(3800);
  const state = await page.evaluate(() => window.__game.state);
  if (state !== 'RUNNING') {
    console.log(`  WARN: Expected RUNNING after countdown, got "${state}"`);
  }
}

// Helper: trigger game over and wait for restart availability
async function goToGameOver(page) {
  await page.evaluate(() => {
    const p = window.__game.player;
    window.__game.obstacles.push({
      type: 'kidney-stone', displayName: 'Kidney Stone',
      x: p.x + 5, y: p.y + 5,
      width: 32, height: 42, color: '#8B6914', hitboxShrink: 0.15,
    });
  });
  // Wait for DYING -> GAME_OVER transition
  await page.waitForTimeout(800);
}

// ---------------------------------------------------------------------------
// Main test flow
// ---------------------------------------------------------------------------
(async () => {
  const server = await startServer();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('\n=== Phase 5: Collectibles + Scoring -- Automated Verification ===\n');

  // -----------------------------------------------------------------
  // 1. CONFIG: GENE_TYPES + Phase 5 Constants
  // -----------------------------------------------------------------
  console.log('--- 1. Gene Config Validation ---');
  await page.goto(URL);
  await page.waitForTimeout(500);

  const geneConfig = await page.evaluate(() => {
    const C = window.CONFIG;
    const types = C.GENE_TYPES;
    return {
      count: types.length,
      names: types.map(t => t.name),
      allHaveRequired: types.every(t =>
        t.name && t.color && typeof t.points === 'number' &&
        typeof t.width === 'number' && typeof t.height === 'number' &&
        t.diseaseName && t.description && t.inheritance &&
        t.omimId && t.omimUrl && t.geneReviewsUrl
      ),
      pkd1: types.find(t => t.name === 'PKD1'),
      col4a5: types.find(t => t.name === 'COL4A5'),
      nphs1: types.find(t => t.name === 'NPHS1'),
      collectibleSpawnBase: C.COLLECTIBLE_SPAWN_BASE_INTERVAL,
      collectibleSpawnVar: C.COLLECTIBLE_SPAWN_VARIATION,
      collectibleFloatAmp: C.COLLECTIBLE_FLOAT_AMPLITUDE,
      collectibleFloatFreq: C.COLLECTIBLE_FLOAT_FREQ,
      riskSpawnProb: C.RISK_SPAWN_PROBABILITY,
      restartCooldown: C.RESTART_COOLDOWN,
      geneLabelFlashDur: C.GENE_LABEL_FLASH_DURATION,
      speedIncrement: C.SPEED_INCREMENT,
      maxSpeed: C.MAX_SPEED,
      gameSpeed: C.GAME_SPEED,
    };
  });

  check('3 gene types defined', geneConfig.count === 3, `got ${geneConfig.count}`);
  check('All gene types have educational fields', geneConfig.allHaveRequired);
  check('PKD1 exists with 10 points', geneConfig.pkd1 && geneConfig.pkd1.points === 10);
  check('COL4A5 exists with 15 points', geneConfig.col4a5 && geneConfig.col4a5.points === 15);
  check('NPHS1 exists with 20 points', geneConfig.nphs1 && geneConfig.nphs1.points === 20);
  check('PKD1 has OMIM ID 173900', geneConfig.pkd1 && geneConfig.pkd1.omimId === '173900');
  check('COL4A5 has OMIM ID 301050', geneConfig.col4a5 && geneConfig.col4a5.omimId === '301050');
  check('NPHS1 has OMIM ID 256300', geneConfig.nphs1 && geneConfig.nphs1.omimId === '256300');
  check('COLLECTIBLE_SPAWN_BASE_INTERVAL exists', typeof geneConfig.collectibleSpawnBase === 'number');
  check('COLLECTIBLE_FLOAT_AMPLITUDE exists', typeof geneConfig.collectibleFloatAmp === 'number');
  check('SPEED_INCREMENT = 2', geneConfig.speedIncrement === 2);
  check('RESTART_COOLDOWN exists', typeof geneConfig.restartCooldown === 'number');
  check('GENE_LABEL_FLASH_DURATION exists', typeof geneConfig.geneLabelFlashDur === 'number');

  // -----------------------------------------------------------------
  // 2. WINDOW.__GAME Phase 5 GETTERS
  // -----------------------------------------------------------------
  console.log('\n--- 2. window.__game Phase 5 Getters ---');

  const gameGetters = await page.evaluate(() => {
    const g = window.__game;
    return {
      hasGenes: 'genes' in g,
      hasGeneSpawnTimer: 'geneSpawnTimer' in g,
      hasGeneScore: 'geneScore' in g,
      hasCollectedGenes: 'collectedGenes' in g,
      hasCurrentSpeed: 'currentSpeed' in g,
      hasPopups: 'popups' in g,
      hasGeneFlashName: 'geneFlashName' in g,
      hasHighScore: 'highScore' in g,
      genesValue: Array.isArray(g.genes),
      currentSpeedValue: g.currentSpeed,
      geneScoreValue: g.geneScore,
      highScoreType: typeof g.highScore,
    };
  });

  check('window.__game.genes exposed', gameGetters.hasGenes && gameGetters.genesValue);
  check('window.__game.geneSpawnTimer exposed', gameGetters.hasGeneSpawnTimer);
  check('window.__game.geneScore exposed', gameGetters.hasGeneScore);
  check('window.__game.collectedGenes exposed', gameGetters.hasCollectedGenes);
  check('window.__game.currentSpeed exposed', gameGetters.hasCurrentSpeed);
  check('window.__game.popups exposed', gameGetters.hasPopups);
  check('window.__game.geneFlashName exposed', gameGetters.hasGeneFlashName);
  check('window.__game.highScore exposed', gameGetters.hasHighScore);
  check('Initial currentSpeed = GAME_SPEED', gameGetters.currentSpeedValue === geneConfig.gameSpeed);
  check('Initial geneScore = 0', gameGetters.geneScoreValue === 0);

  // -----------------------------------------------------------------
  // 3. GENE SPAWNING
  // -----------------------------------------------------------------
  console.log('\n--- 3. Gene Spawning ---');

  // Speed up gene spawning for testing
  await page.evaluate(() => {
    window.CONFIG.COLLECTIBLE_SPAWN_BASE_INTERVAL = 0.3;
    window.CONFIG.COLLECTIBLE_SPAWN_VARIATION = 0.05;
    window.CONFIG.SPAWN_BASE_INTERVAL = 999; // suppress obstacles
  });

  await startGame(page);

  // Wait for genes to spawn
  await page.waitForTimeout(2000);

  const spawnData = await page.evaluate(() => ({
    count: window.__game.genes.length,
    state: window.__game.state,
    types: window.__game.genes.map(g => g.type),
    hasFloat: window.__game.genes.some(g => g.floatPhase !== undefined),
    hasBaseY: window.__game.genes.some(g => g.baseY !== undefined),
  }));

  check('Genes spawned', spawnData.count > 0, `count = ${spawnData.count}`);
  check('Game still RUNNING', spawnData.state === 'RUNNING');
  check('Genes have floatPhase property', spawnData.hasFloat);
  check('Genes have baseY property', spawnData.hasBaseY);

  // Check gene types are valid
  const validTypes = new Set(['PKD1', 'COL4A5', 'NPHS1']);
  const allValid = spawnData.types.every(t => validTypes.has(t));
  check('All spawned genes have valid types', allValid, `types: [${spawnData.types.join(', ')}]`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-genes-spawning.png` });

  // -----------------------------------------------------------------
  // 4. GENE FLOATING ANIMATION
  // -----------------------------------------------------------------
  console.log('\n--- 4. Gene Floating Animation ---');

  // Record Y positions, wait, check they changed (sine motion)
  const floatCheck1 = await page.evaluate(() => {
    if (window.__game.genes.length === 0) return null;
    const g = window.__game.genes[0];
    return { y: g.y, baseY: g.baseY, phase: g.floatPhase };
  });

  await page.waitForTimeout(300);

  const floatCheck2 = await page.evaluate(() => {
    if (window.__game.genes.length === 0) return null;
    const g = window.__game.genes[0];
    return { y: g.y, baseY: g.baseY, phase: g.floatPhase };
  });

  if (floatCheck1 && floatCheck2) {
    check('Gene Y position changes (floating)', floatCheck1.y !== floatCheck2.y,
      `y1=${floatCheck1.y.toFixed(1)}, y2=${floatCheck2.y.toFixed(1)}`);
    check('Gene baseY stays constant', floatCheck1.baseY === floatCheck2.baseY);
    check('Gene floatPhase advances', floatCheck2.phase > floatCheck1.phase,
      `phase1=${floatCheck1.phase.toFixed(2)}, phase2=${floatCheck2.phase.toFixed(2)}`);
  } else {
    check('Genes available for float test', false, 'no genes found');
  }

  // -----------------------------------------------------------------
  // 5. GENE MOVEMENT (scrolling left)
  // -----------------------------------------------------------------
  console.log('\n--- 5. Gene Movement ---');

  const moveCheck1 = await page.evaluate(() => {
    if (window.__game.genes.length === 0) return null;
    return window.__game.genes[0].x;
  });
  await page.waitForTimeout(300);
  const moveCheck2 = await page.evaluate(() => {
    if (window.__game.genes.length === 0) return null;
    return window.__game.genes[0].x;
  });

  if (moveCheck1 !== null && moveCheck2 !== null) {
    check('Genes move left', moveCheck2 < moveCheck1,
      `${moveCheck1.toFixed(0)} -> ${moveCheck2.toFixed(0)}`);
  } else {
    check('Genes exist for movement test', false, 'no genes found');
  }

  // -----------------------------------------------------------------
  // 6. GENE COLLECTION (AABB)
  // -----------------------------------------------------------------
  console.log('\n--- 6. Gene Collection ---');

  // Clear existing genes and place one directly on the player
  const collectionResult = await page.evaluate(() => {
    const p = window.__game.player;
    const C = window.CONFIG;
    const prevScore = window.__game.geneScore;
    const prevCollected = window.__game.collectedGenes.length;

    // Clear all genes and inject one overlapping the player
    window.__game.genes.length = 0;
    const type = C.GENE_TYPES[0]; // PKD1, 10 points
    window.__game.genes.push({
      type: type.name,
      typeData: type,
      x: p.x + 10,
      y: p.y + 10,
      baseY: p.y + 10,
      width: type.width,
      height: type.height,
      color: type.color,
      points: type.points,
      floatPhase: 0,
      dead: false,
    });

    return {
      prevScore,
      prevCollected,
      playerX: p.x,
      playerY: p.y,
      geneX: p.x + 10,
      geneY: p.y + 10,
    };
  });

  // Wait one frame for collision check
  await page.waitForTimeout(50);

  const afterCollection = await page.evaluate(() => ({
    geneScore: window.__game.geneScore,
    collectedCount: window.__game.collectedGenes.length,
    genesOnScreen: window.__game.genes.length,
    popupCount: window.__game.popups.length,
    geneFlashName: window.__game.geneFlashName,
  }));

  check('Gene collected (removed from screen)',
    afterCollection.genesOnScreen === 0,
    `genes remaining: ${afterCollection.genesOnScreen}`);
  check('Gene score increased by 10',
    afterCollection.geneScore === collectionResult.prevScore + 10,
    `before=${collectionResult.prevScore}, after=${afterCollection.geneScore}`);
  check('collectedGenes count increased',
    afterCollection.collectedCount === collectionResult.prevCollected + 1,
    `before=${collectionResult.prevCollected}, after=${afterCollection.collectedCount}`);
  check('Popup spawned on collection',
    afterCollection.popupCount > 0,
    `popups: ${afterCollection.popupCount}`);
  check('Gene flash triggered',
    afterCollection.geneFlashName !== null,
    `flash name: ${afterCollection.geneFlashName}`);
  check('Gene flash shows correct name',
    afterCollection.geneFlashName === 'PKD1!',
    `got "${afterCollection.geneFlashName}"`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-gene-collected.png` });

  // -----------------------------------------------------------------
  // 7. POPUP PARTICLES
  // -----------------------------------------------------------------
  console.log('\n--- 7. Popup Particles ---');

  // Inject a popup and verify it drifts up and fades
  await page.evaluate(() => {
    // Clear existing popups first
    while (window.__game.popups.length > 0) window.__game.popups.pop();
  });
  await page.waitForTimeout(50);

  // Collect another gene to trigger a popup
  await page.evaluate(() => {
    const p = window.__game.player;
    const C = window.CONFIG;
    const type = C.GENE_TYPES[1]; // COL4A5
    window.__game.genes.push({
      type: type.name, typeData: type,
      x: p.x + 5, y: p.y + 5, baseY: p.y + 5,
      width: type.width, height: type.height,
      color: type.color, points: type.points,
      floatPhase: 0, dead: false,
    });
  });
  await page.waitForTimeout(50);

  const popupData1 = await page.evaluate(() => {
    if (window.__game.popups.length === 0) return null;
    const p = window.__game.popups[window.__game.popups.length - 1];
    return { y: p.y, alpha: p.alpha, text: p.text };
  });

  if (popupData1) {
    check('Popup has text with + prefix', popupData1.text.startsWith('+'),
      `text: "${popupData1.text}"`);
    check('Popup starts with alpha ~1.0', popupData1.alpha > 0.8,
      `alpha: ${popupData1.alpha.toFixed(2)}`);

    await page.waitForTimeout(400);
    const popupData2 = await page.evaluate(() => {
      if (window.__game.popups.length === 0) return { gone: true };
      const p = window.__game.popups[window.__game.popups.length - 1];
      return { y: p.y, alpha: p.alpha, gone: false };
    });

    if (!popupData2.gone) {
      check('Popup drifts upward', popupData2.y < popupData1.y,
        `y: ${popupData1.y.toFixed(0)} -> ${popupData2.y.toFixed(0)}`);
      check('Popup alpha decreases', popupData2.alpha < popupData1.alpha,
        `alpha: ${popupData1.alpha.toFixed(2)} -> ${popupData2.alpha.toFixed(2)}`);
    } else {
      check('Popup faded out (expected)', true);
    }
  } else {
    check('Popup created on collection', false, 'no popups found');
  }

  // -----------------------------------------------------------------
  // 8. GENE FLASH DECAY
  // -----------------------------------------------------------------
  console.log('\n--- 8. Gene Flash Decay ---');

  // Gene flash should decay over GENE_LABEL_FLASH_DURATION (1.0s)
  const flashBefore = await page.evaluate(() => ({
    name: window.__game.geneFlashName,
  }));

  // Flash should still be active (we just collected a gene)
  check('Gene flash is active', flashBefore.name !== null, `name: ${flashBefore.name}`);

  await page.waitForTimeout(1200); // > GENE_LABEL_FLASH_DURATION (1.0s)

  const flashAfter = await page.evaluate(() => ({
    name: window.__game.geneFlashName,
  }));
  check('Gene flash expired after duration', flashAfter.name === null,
    `name: ${flashAfter.name}`);

  // -----------------------------------------------------------------
  // 9. DIFFICULTY RAMP (currentSpeed increases)
  // -----------------------------------------------------------------
  console.log('\n--- 9. Difficulty Ramp ---');

  const speedBefore = await page.evaluate(() => window.__game.currentSpeed);
  await page.waitForTimeout(1000);
  const speedAfter = await page.evaluate(() => window.__game.currentSpeed);

  check('currentSpeed increases over time', speedAfter > speedBefore,
    `${speedBefore.toFixed(1)} -> ${speedAfter.toFixed(1)}`);

  // Verify it doesn't exceed MAX_SPEED (hard to test in short time, but verify logic)
  const speedCapCheck = await page.evaluate(() => ({
    current: window.__game.currentSpeed,
    max: window.CONFIG.MAX_SPEED,
  }));
  check('currentSpeed <= MAX_SPEED', speedCapCheck.current <= speedCapCheck.max,
    `current=${speedCapCheck.current.toFixed(1)}, max=${speedCapCheck.max}`);

  // -----------------------------------------------------------------
  // 10. HUD DISPLAY
  // -----------------------------------------------------------------
  console.log('\n--- 10. HUD Display ---');

  // HUD renders text on canvas -- verify state values are sensible for HUD
  const hudData = await page.evaluate(() => ({
    distance: window.__game.distance,
    geneScore: window.__game.geneScore,
    collectedCount: window.__game.collectedGenes.length,
    state: window.__game.state,
  }));

  check('Distance > 0 while running', hudData.distance > 0, `distance: ${hudData.distance.toFixed(0)}`);
  check('Gene score > 0 after collecting', hudData.geneScore > 0, `score: ${hudData.geneScore}`);
  check('Collected genes tracked', hudData.collectedCount > 0, `count: ${hudData.collectedCount}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-hud-running.png` });

  // -----------------------------------------------------------------
  // 11. EDUCATIONAL GAME OVER SCREEN
  // -----------------------------------------------------------------
  console.log('\n--- 11. Educational Game Over Screen ---');

  // Record pre-death state
  const preDeath = await page.evaluate(() => ({
    geneScore: window.__game.geneScore,
    distance: window.__game.distance,
    collectedGenes: window.__game.collectedGenes.length,
  }));

  // Trigger death
  await goToGameOver(page);

  const gameOverState = await page.evaluate(() => ({
    state: window.__game.state,
    highScore: window.__game.highScore,
    gameOverTimer: window.__game.gameOverTimer,
  }));

  check('Game transitions to GAME_OVER', gameOverState.state === 'GAME_OVER',
    `got "${gameOverState.state}"`);
  check('High score saved', gameOverState.highScore >= 0,
    `highScore: ${gameOverState.highScore}`);

  // Wait for the overlay to fully appear
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-game-over-educational.png` });

  // -----------------------------------------------------------------
  // 12. HIGH SCORE PERSISTENCE (localStorage)
  // -----------------------------------------------------------------
  console.log('\n--- 12. High Score Persistence ---');

  const lsHighScore = await page.evaluate(() => {
    const raw = localStorage.getItem('kidneyquest_highscore');
    return raw ? parseInt(raw, 10) : null;
  });

  check('High score saved to localStorage', lsHighScore !== null && lsHighScore >= 0,
    `localStorage value: ${lsHighScore}`);

  // Verify __game.highScore matches localStorage
  const gameHighScore = await page.evaluate(() => window.__game.highScore);
  check('window.__game.highScore matches localStorage',
    gameHighScore === lsHighScore,
    `game: ${gameHighScore}, localStorage: ${lsHighScore}`);

  // -----------------------------------------------------------------
  // 13. RESTART COOLDOWN
  // -----------------------------------------------------------------
  console.log('\n--- 13. Restart Cooldown ---');

  // Immediately try to restart -- should be ignored
  await page.keyboard.press('Space');
  await page.waitForTimeout(50);
  const stilGO = await page.evaluate(() => window.__game.state);
  check('Space ignored during restart cooldown', stilGO === 'GAME_OVER',
    `got "${stilGO}"`);

  // Wait for cooldown to expire (RESTART_COOLDOWN = 1.5s)
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-game-over-restart-ready.png` });

  // -----------------------------------------------------------------
  // 14. RESTART CLEANS ALL STATE
  // -----------------------------------------------------------------
  console.log('\n--- 14. Restart Cleans State ---');

  await page.keyboard.press('Space');
  await page.waitForTimeout(50);

  const restartState = await page.evaluate(() => ({
    state: window.__game.state,
    distance: window.__game.distance,
    geneScore: window.__game.geneScore,
    collectedGenes: window.__game.collectedGenes.length,
    genes: window.__game.genes.length,
    currentSpeed: window.__game.currentSpeed,
    popups: window.__game.popups.length,
    geneFlashName: window.__game.geneFlashName,
    obstacles: window.__game.obstacles.length,
    gameElapsed: window.__game.gameElapsed,
  }));

  check('Restart returns to READY', restartState.state === 'READY',
    `got "${restartState.state}"`);
  check('Distance reset to 0', restartState.distance === 0,
    `got ${restartState.distance}`);
  check('Gene score reset to 0', restartState.geneScore === 0,
    `got ${restartState.geneScore}`);
  check('Collected genes cleared', restartState.collectedGenes === 0,
    `got ${restartState.collectedGenes}`);
  check('Active genes cleared', restartState.genes === 0,
    `got ${restartState.genes}`);
  check('currentSpeed reset to GAME_SPEED',
    restartState.currentSpeed === geneConfig.gameSpeed,
    `got ${restartState.currentSpeed}, expected ${geneConfig.gameSpeed}`);
  check('Popups cleared', restartState.popups === 0,
    `got ${restartState.popups}`);
  check('Gene flash cleared', restartState.geneFlashName === null,
    `got ${restartState.geneFlashName}`);
  check('Obstacles cleared', restartState.obstacles === 0,
    `got ${restartState.obstacles}`);
  check('gameElapsed reset to 0', restartState.gameElapsed === 0,
    `got ${restartState.gameElapsed}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-restarted-clean.png` });

  // -----------------------------------------------------------------
  // 15. HIGH SCORE PERSISTS ACROSS RESTART
  // -----------------------------------------------------------------
  console.log('\n--- 15. High Score Persistence Across Restart ---');

  const postRestartHS = await page.evaluate(() => window.__game.highScore);
  check('High score persists after restart', postRestartHS === lsHighScore,
    `restart: ${postRestartHS}, original: ${lsHighScore}`);

  // -----------------------------------------------------------------
  // 16. FULL GAME CYCLE: Start -> Collect -> Die -> Restart -> Collect
  // -----------------------------------------------------------------
  console.log('\n--- 16. Full Game Cycle ---');

  // Restore spawn rates
  await page.evaluate(() => {
    window.CONFIG.COLLECTIBLE_SPAWN_BASE_INTERVAL = 0.2;
    window.CONFIG.COLLECTIBLE_SPAWN_VARIATION = 0.02;
    window.CONFIG.SPAWN_BASE_INTERVAL = 999; // keep obstacles suppressed
  });

  // Start new game
  await startGame(page);

  // Let some genes spawn and check collection over time
  await page.waitForTimeout(1500);

  const midGame = await page.evaluate(() => ({
    genes: window.__game.genes.length,
    geneScore: window.__game.geneScore,
    distance: window.__game.distance,
    currentSpeed: window.__game.currentSpeed,
    state: window.__game.state,
  }));

  check('Genes spawning in new game', midGame.genes > 0 || midGame.geneScore > 0,
    `onScreen: ${midGame.genes}, score: ${midGame.geneScore}`);
  check('Distance accumulating', midGame.distance > 0,
    `distance: ${midGame.distance.toFixed(0)}`);
  check('Speed ramping', midGame.currentSpeed > geneConfig.gameSpeed,
    `speed: ${midGame.currentSpeed.toFixed(1)}`);

  // Force-collect some genes by placing them on the player
  for (let i = 0; i < 3; i++) {
    await page.evaluate((idx) => {
      const p = window.__game.player;
      const C = window.CONFIG;
      const type = C.GENE_TYPES[idx % 3];
      window.__game.genes.push({
        type: type.name, typeData: type,
        x: p.x + 5, y: p.y + 5, baseY: p.y + 5,
        width: type.width, height: type.height,
        color: type.color, points: type.points,
        floatPhase: 0, dead: false,
      });
    }, i);
    await page.waitForTimeout(60);
  }

  const afterCollect = await page.evaluate(() => ({
    geneScore: window.__game.geneScore,
    collectedCount: window.__game.collectedGenes.length,
    uniqueTypes: [...new Set(window.__game.collectedGenes.map(g => g.name))],
  }));

  check('Collected multiple gene types', afterCollect.uniqueTypes.length >= 2,
    `types: [${afterCollect.uniqueTypes.join(', ')}]`);
  check('Gene score reflects all collections', afterCollect.geneScore > 0,
    `score: ${afterCollect.geneScore}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-mid-game-collected.png` });

  // Die and verify game over screen with gene cards
  await goToGameOver(page);
  await page.waitForTimeout(500);

  const gameOverData = await page.evaluate(() => ({
    state: window.__game.state,
    highScore: window.__game.highScore,
    collectedGenes: window.__game.collectedGenes.length,
  }));

  check('Game over with collected genes', gameOverData.state === 'GAME_OVER');
  check('Collected genes available for game over cards',
    gameOverData.collectedGenes > 0,
    `count: ${gameOverData.collectedGenes}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-game-over-with-cards.png` });

  // -----------------------------------------------------------------
  // 17. GENES FREEZE ON PAUSE
  // -----------------------------------------------------------------
  console.log('\n--- 17. Genes Freeze on Pause ---');

  // Restart and start new game
  await page.waitForTimeout(2000);
  await page.keyboard.press('Space'); // restart
  await page.waitForTimeout(100);

  await page.evaluate(() => {
    window.CONFIG.COLLECTIBLE_SPAWN_BASE_INTERVAL = 0.2;
    window.CONFIG.COLLECTIBLE_SPAWN_VARIATION = 0.02;
  });

  await startGame(page);
  await page.waitForTimeout(1500); // let genes spawn

  // Pause
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);

  const pauseCheck = await page.evaluate(() => ({
    state: window.__game.state,
    geneCount: window.__game.genes.length,
  }));
  check('Game paused', pauseCheck.state === 'PAUSED');

  if (pauseCheck.geneCount > 0) {
    const pauseGeneX1 = await page.evaluate(() => window.__game.genes[0].x);
    await page.waitForTimeout(300);
    const pauseGeneX2 = await page.evaluate(() => window.__game.genes[0].x);
    check('Genes frozen during PAUSED', pauseGeneX2 === pauseGeneX1,
      `${pauseGeneX1.toFixed(1)} -> ${pauseGeneX2.toFixed(1)}`);
  } else {
    check('Genes available for pause test', false, 'no genes on screen');
  }

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-genes-paused.png` });

  // Resume
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);

  // -----------------------------------------------------------------
  // 18. GENES FREEZE ON GAME OVER
  // -----------------------------------------------------------------
  console.log('\n--- 18. Genes Freeze on Game Over ---');

  // Wait for some genes to be on screen
  await page.waitForTimeout(500);

  const preDeathGenes = await page.evaluate(() => window.__game.genes.length);
  await goToGameOver(page);

  if (preDeathGenes > 0) {
    const goGenes = await page.evaluate(() => window.__game.genes.length);
    if (goGenes > 0) {
      const goGeneX1 = await page.evaluate(() => window.__game.genes[0].x);
      await page.waitForTimeout(300);
      const goGeneX2 = await page.evaluate(() => window.__game.genes[0].x);
      check('Genes frozen during GAME_OVER', goGeneX2 === goGeneX1,
        `${goGeneX1.toFixed(1)} -> ${goGeneX2.toFixed(1)}`);
    } else {
      check('Genes visible during game over', false, 'genes cleared on death');
    }
  } else {
    console.log('  SKIP  No genes on screen for freeze test');
  }

  // -----------------------------------------------------------------
  // 19. CONSOLE ERRORS CHECK
  // -----------------------------------------------------------------
  console.log('\n--- 19. Console Errors ---');
  check('No console errors', consoleErrors.length === 0,
    consoleErrors.length > 0 ? consoleErrors.join('; ') : '');

  // ---------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------
  console.log('\n' + '='.repeat(60));
  console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(60));

  if (issues.length === 0) {
    console.log('\n  ALL CHECKS PASSED\n');
  } else {
    console.log('\n  ISSUES:');
    issues.forEach(i => console.log(`    - ${i}`));
    console.log('');
  }

  console.log(`  Screenshots: ${SCREENSHOTS_DIR}/\n`);

  await browser.close();
  server.close();

  process.exit(failed > 0 ? 1 : 0);
})();
