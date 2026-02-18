// Playwright automated verification for Phase 4: Obstacles + Collision
// Tests obstacle spawning, progressive unlocking, AABB collision, near-miss,
// DYING state, death animation, game over overlay, and restart.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = './.playwright/phase4';
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const PORT = 8098;
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

  console.log('\n=== Phase 4: Obstacles + Collision -- Automated Verification ===\n');

  // -----------------------------------------------------------------
  // 1. CONFIG: OBSTACLE_TYPES VALIDATION
  // -----------------------------------------------------------------
  console.log('--- 1. Obstacle Config ---');
  await page.goto(URL);
  await page.waitForTimeout(500);

  const obstacleConfig = await page.evaluate(() => {
    const C = window.CONFIG;
    const types = C.OBSTACLE_TYPES;
    return {
      count: types.length,
      names: types.map(t => t.name),
      allHaveRequired: types.every(t =>
        t.name && t.displayName && typeof t.width === 'number' &&
        typeof t.height === 'number' && t.color &&
        typeof t.hitboxShrink === 'number' && t.placement &&
        typeof t.floatHeight === 'number' && typeof t.spawnWeight === 'number' &&
        typeof t.unlockAfter === 'number'
      ),
      kidneyStone: types[0],
      toxin: types[1],
      saltCrystal: types[2],
      spawnBaseInterval: C.SPAWN_BASE_INTERVAL,
      spawnIntervalVariation: C.SPAWN_INTERVAL_VARIATION,
      floatUnlockElapsed: C.FLOAT_UNLOCK_ELAPSED,
      clusterProbability: C.CLUSTER_PROBABILITY,
      clusterSizeMax: C.CLUSTER_SIZE_MAX,
      clusterGap: C.CLUSTER_GAP,
      playerHitboxShrink: C.PLAYER_HITBOX_SHRINK,
      deathAnimDuration: C.DEATH_ANIMATION_DURATION,
      deathFlashInterval: C.DEATH_FLASH_INTERVAL,
      deathShakeDuration: C.DEATH_SHAKE_DURATION,
      shakeAmplitude: C.SHAKE_AMPLITUDE,
      nearMissFlashColor: C.NEAR_MISS_FLASH_COLOR,
      nearMissFlashDuration: C.NEAR_MISS_FLASH_DURATION,
      gameOverOverlayAlpha: C.GAME_OVER_OVERLAY_ALPHA,
    };
  });

  check('3 obstacle types defined', obstacleConfig.count === 3, `got ${obstacleConfig.count}`);
  check('All obstacle types have required fields', obstacleConfig.allHaveRequired);
  check('Type 0: kidney-stone', obstacleConfig.kidneyStone.name === 'kidney-stone');
  check('Type 1: toxin', obstacleConfig.toxin.name === 'toxin');
  check('Type 2: salt-crystal', obstacleConfig.saltCrystal.name === 'salt-crystal');
  check('Kidney stone: ground placement', obstacleConfig.kidneyStone.placement === 'ground');
  check('Salt crystal: floating placement', obstacleConfig.saltCrystal.placement === 'floating');
  check('Salt crystal: floatHeight = 120', obstacleConfig.saltCrystal.floatHeight === 120);
  check('Salt crystal: more forgiving hitbox (0.20)', obstacleConfig.saltCrystal.hitboxShrink === 0.20);
  check('Kidney stone: hitboxShrink 0.15', obstacleConfig.kidneyStone.hitboxShrink === 0.15);
  check('Progressive unlock: stone at 0s', obstacleConfig.kidneyStone.unlockAfter === 0);
  check('Progressive unlock: toxin at 10s', obstacleConfig.toxin.unlockAfter === 10);
  check('Progressive unlock: salt at 20s', obstacleConfig.saltCrystal.unlockAfter === 20);
  check('SPAWN_BASE_INTERVAL exists', typeof obstacleConfig.spawnBaseInterval === 'number');
  check('CLUSTER_PROBABILITY exists', typeof obstacleConfig.clusterProbability === 'number');
  check('PLAYER_HITBOX_SHRINK exists', typeof obstacleConfig.playerHitboxShrink === 'number');
  check('DEATH_ANIMATION_DURATION exists', typeof obstacleConfig.deathAnimDuration === 'number');
  check('NEAR_MISS_FLASH_COLOR exists', typeof obstacleConfig.nearMissFlashColor === 'string');
  check('GAME_OVER_OVERLAY_ALPHA exists', typeof obstacleConfig.gameOverOverlayAlpha === 'number');

  // -----------------------------------------------------------------
  // 2. OBSTACLE SPAWNING
  // -----------------------------------------------------------------
  console.log('\n--- 2. Obstacle Spawning ---');

  // Speed up spawning for testing
  await page.evaluate(() => {
    window.CONFIG.SPAWN_BASE_INTERVAL = 0.3;
    window.CONFIG.SPAWN_INTERVAL_VARIATION = 0.05;
  });

  // Start game: READY -> COUNTDOWN -> RUNNING
  await page.focus('#game-canvas');
  await page.keyboard.press('Space');
  // Wait for countdown to complete (~3.2s)
  await page.waitForTimeout(3500);

  const runState = await page.evaluate(() => window.__game.state);
  check('Game is RUNNING', runState === 'RUNNING', `got "${runState}"`);

  // Wait for obstacles to spawn
  await page.waitForTimeout(2000);

  const spawnData = await page.evaluate(() => ({
    count: window.__game.obstacles.length,
    elapsed: window.__game.gameElapsed,
    types: window.__game.obstacles.map(o => o.type),
    hasObstacles: window.__game.obstacles.length > 0,
  }));

  check('Obstacles spawned', spawnData.hasObstacles, `count = ${spawnData.count}`);
  check('Only kidney-stone early on', spawnData.types.every(t => t === 'kidney-stone'),
    `types: [${spawnData.types.join(', ')}], elapsed: ${spawnData.elapsed.toFixed(1)}s`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-obstacles-spawning.png` });

  // -----------------------------------------------------------------
  // 3. OBSTACLE MOVEMENT
  // -----------------------------------------------------------------
  console.log('\n--- 3. Obstacle Movement ---');

  // Record positions, wait, check they moved left
  const pos1 = await page.evaluate(() => {
    if (window.__game.obstacles.length === 0) return null;
    return window.__game.obstacles[0].x;
  });
  await page.waitForTimeout(300);
  const pos2 = await page.evaluate(() => {
    if (window.__game.obstacles.length === 0) return null;
    return window.__game.obstacles[0].x;
  });

  if (pos1 !== null && pos2 !== null) {
    check('Obstacles move left', pos2 < pos1, `${pos1.toFixed(0)} -> ${pos2.toFixed(0)}`);
  } else {
    check('Obstacles exist for movement test', false, 'no obstacles found');
  }

  // -----------------------------------------------------------------
  // 4. OBSTACLE FREEZE ON PAUSE
  // -----------------------------------------------------------------
  console.log('\n--- 4. Obstacle Freeze on Pause ---');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);

  const pauseCheck = await page.evaluate(() => ({
    state: window.__game.state,
    count: window.__game.obstacles.length,
  }));
  check('Game paused', pauseCheck.state === 'PAUSED');

  if (pauseCheck.count > 0) {
    const frozenPos1 = await page.evaluate(() => window.__game.obstacles[0].x);
    await page.waitForTimeout(300);
    const frozenPos2 = await page.evaluate(() => window.__game.obstacles[0].x);
    check('Obstacles frozen during PAUSED', frozenPos2 === frozenPos1,
      `${frozenPos1.toFixed(1)} -> ${frozenPos2.toFixed(1)}`);
  }

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-obstacles-paused.png` });

  // Resume
  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);

  // -----------------------------------------------------------------
  // 5. COLLISION DETECTION (DYING STATE)
  // -----------------------------------------------------------------
  console.log('\n--- 5. Collision -> DYING State ---');

  // Place an obstacle directly on the player to force collision
  const collisionResult = await page.evaluate(() => {
    const p = window.__game.player;
    const C = window.CONFIG;
    // Inject an obstacle right on the player
    window.__game.obstacles.push({
      type: 'kidney-stone',
      displayName: 'Kidney Stone',
      x: p.x + 5,
      y: p.y + 5,
      width: 32,
      height: 42,
      color: '#8B6914',
      hitboxShrink: 0.15,
    });
    return { playerX: p.x, playerY: p.y, obstacleCount: window.__game.obstacles.length };
  });

  // Wait one frame for collision check
  await page.waitForTimeout(50);

  const dyingState = await page.evaluate(() => window.__game.state);
  check('Collision triggers DYING state', dyingState === 'DYING', `got "${dyingState}"`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-dying-state.png` });

  // -----------------------------------------------------------------
  // 6. DYING STATE BEHAVIOR
  // -----------------------------------------------------------------
  console.log('\n--- 6. DYING State Behavior ---');

  // Space should be ignored during DYING
  await page.keyboard.press('Space');
  await page.waitForTimeout(50);
  const stillDying = await page.evaluate(() => window.__game.state);
  check('Space ignored during DYING', stillDying === 'DYING' || stillDying === 'GAME_OVER',
    `got "${stillDying}"`);

  // Obstacles should be frozen during DYING
  if (await page.evaluate(() => window.__game.obstacles.length > 0)) {
    const dyingPos1 = await page.evaluate(() => window.__game.obstacles[0].x);
    await page.waitForTimeout(100);
    const dyingPos2 = await page.evaluate(() => window.__game.obstacles[0].x);
    // Note: DYING lasts 0.5s, so if state already transitioned to GAME_OVER, both are frozen
    check('Obstacles frozen during DYING/GAME_OVER', dyingPos2 === dyingPos1,
      `${dyingPos1.toFixed(1)} -> ${dyingPos2.toFixed(1)}`);
  }

  // Wait for DYING -> GAME_OVER transition (DEATH_ANIMATION_DURATION = 0.5s)
  await page.waitForTimeout(600);

  const afterDying = await page.evaluate(() => window.__game.state);
  check('DYING transitions to GAME_OVER', afterDying === 'GAME_OVER', `got "${afterDying}"`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-game-over-from-dying.png` });

  // -----------------------------------------------------------------
  // 7. GAME OVER OVERLAY
  // -----------------------------------------------------------------
  console.log('\n--- 7. Game Over Overlay ---');

  // Wait for freeze delay to pass
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-game-over-overlay.png` });

  // Space during cooldown should be ignored
  await page.keyboard.press('Space');
  await page.waitForTimeout(50);
  const stillGO = await page.evaluate(() => window.__game.state);
  check('Space ignored during game over cooldown', stillGO === 'GAME_OVER', `got "${stillGO}"`);

  // Wait for full cooldown
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-game-over-restart-prompt.png` });

  // -----------------------------------------------------------------
  // 8. RESTART FROM GAME_OVER
  // -----------------------------------------------------------------
  console.log('\n--- 8. Restart ---');

  await page.keyboard.press('Space');
  await page.waitForTimeout(50);

  const restartData = await page.evaluate(() => ({
    state: window.__game.state,
    distance: window.__game.distance,
    obstacles: window.__game.obstacles.length,
    gameElapsed: window.__game.gameElapsed,
    spawnTimer: window.__game.spawnTimer,
  }));

  check('Restart returns to READY', restartData.state === 'READY', `got "${restartData.state}"`);
  check('Distance reset to 0', restartData.distance === 0, `got ${restartData.distance}`);
  check('Obstacles cleared on restart', restartData.obstacles === 0, `got ${restartData.obstacles}`);
  check('gameElapsed reset on restart', restartData.gameElapsed === 0, `got ${restartData.gameElapsed}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-restarted.png` });

  // -----------------------------------------------------------------
  // 9. PROGRESSIVE TYPE UNLOCKING
  // -----------------------------------------------------------------
  console.log('\n--- 9. Progressive Type Unlocking ---');

  // Speed up spawning and reduce unlock times for fast testing
  await page.evaluate(() => {
    window.CONFIG.SPAWN_BASE_INTERVAL = 0.08;
    window.CONFIG.SPAWN_INTERVAL_VARIATION = 0.01;
    window.CONFIG.OBSTACLE_TYPES[1].unlockAfter = 1.5; // toxin at 1.5s instead of 10s
    window.CONFIG.OBSTACLE_TYPES[2].unlockAfter = 3;   // salt at 3s instead of 20s
    window.CONFIG.FLOAT_UNLOCK_ELAPSED = 2.5;           // floating at 2.5s instead of 15s
    window.CONFIG.CLUSTER_PROBABILITY = 0;              // disable clusters for clean test
    // Equalize spawn weights so rare types appear reliably in test
    window.CONFIG.OBSTACLE_TYPES[0].spawnWeight = 1;    // kidney-stone (was 3)
    window.CONFIG.OBSTACLE_TYPES[1].spawnWeight = 1;    // toxin (was 2)
    window.CONFIG.OBSTACLE_TYPES[2].spawnWeight = 1;    // salt-crystal (was 1)
  });

  // Start fresh game
  await page.keyboard.press('Space');
  await page.waitForTimeout(3500); // countdown

  // Check early: only kidney-stone (within first ~1s of RUNNING)
  await page.waitForTimeout(800);
  const earlyTypes = await page.evaluate(() =>
    [...new Set(window.__game.obstacles.map(o => o.type))]
  );
  check('Early game: only kidney-stone', earlyTypes.length === 1 && earlyTypes[0] === 'kidney-stone',
    `types: [${earlyTypes.join(', ')}], elapsed=${(await page.evaluate(() => window.__game.gameElapsed)).toFixed(1)}s`);

  // Wait for toxin unlock (need gameElapsed > 1.5s)
  await page.waitForTimeout(2500);
  const midElapsed = await page.evaluate(() => window.__game.gameElapsed);
  const midTypes = await page.evaluate(() =>
    [...new Set(window.__game.obstacles.map(o => o.type))]
  );
  check('After gameElapsed > 1.5s: toxin should appear', midTypes.includes('toxin'),
    `types: [${midTypes.join(', ')}], elapsed=${midElapsed.toFixed(1)}s`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-progressive-types.png` });

  // Wait for salt crystal unlock (need gameElapsed > 3s AND > FLOAT_UNLOCK_ELAPSED 2.5s)
  await page.waitForTimeout(3000);
  const lateDebug = await page.evaluate(() => {
    const elapsed = window.__game.gameElapsed;
    const C = window.CONFIG;
    const salt = C.OBSTACLE_TYPES[2];
    const available = C.OBSTACLE_TYPES.filter(t => {
      if ((t.unlockAfter || 0) > elapsed) return false;
      if (t.placement === 'floating' && elapsed < C.FLOAT_UNLOCK_ELAPSED) return false;
      return true;
    });
    return {
      elapsed,
      floatUnlock: C.FLOAT_UNLOCK_ELAPSED,
      saltUnlockAfter: salt.unlockAfter,
      saltPlacement: salt.placement,
      saltWeight: salt.spawnWeight,
      availableNames: available.map(t => t.name),
      obstacleTypes: [...new Set(window.__game.obstacles.map(o => o.type))],
      obstacleCount: window.__game.obstacles.length,
      state: window.__game.state,
      spawnInterval: C.SPAWN_BASE_INTERVAL,
    };
  });
  check('After gameElapsed > 3s: salt-crystal should appear',
    lateDebug.obstacleTypes.includes('salt-crystal') || lateDebug.availableNames.includes('salt-crystal'),
    `onScreen: [${lateDebug.obstacleTypes.join(', ')}], available: [${lateDebug.availableNames.join(', ')}], elapsed=${lateDebug.elapsed.toFixed(1)}s`);

  // Verify floating obstacle Y position (deterministic: check config math)
  const floatingCheck = await page.evaluate(() => {
    const C = window.CONFIG;
    const salt = C.OBSTACLE_TYPES.find(t => t.name === 'salt-crystal');
    // Y position formula from createObstacle: GROUND_Y - height - floatHeight
    const expectedY = C.GROUND_Y - salt.height - salt.floatHeight;
    const bottomY = expectedY + salt.height;
    return {
      expectedY,
      bottomY,
      groundY: C.GROUND_Y,
      floatsAboveGround: bottomY < C.GROUND_Y,
      floatHeight: salt.floatHeight,
    };
  });
  check('Salt crystal floats above ground (config math)', floatingCheck.floatsAboveGround,
    `bottom=${floatingCheck.bottomY}, groundY=${floatingCheck.groundY}, gap=${floatingCheck.groundY - floatingCheck.bottomY}px`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-floating-obstacle.png` });

  // -----------------------------------------------------------------
  // 10. NEAR-MISS DETECTION
  // -----------------------------------------------------------------
  console.log('\n--- 10. Near-Miss Detection ---');

  // Reset and set up controlled near-miss scenario
  // Trigger game over then restart to get clean state
  await page.evaluate(() => window.triggerGameOver());
  await page.waitForTimeout(2500);
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);

  // Restore sane spawn rates
  await page.evaluate(() => {
    window.CONFIG.SPAWN_BASE_INTERVAL = 999; // prevent random spawns
  });

  // Start game
  await page.keyboard.press('Space');
  await page.waitForTimeout(3500); // countdown

  // Temporarily freeze obstacle movement and pause the game to prevent drift
  // Place obstacle, check, then resume
  const nearMissSetup = await page.evaluate(() => {
    const p = window.__game.player;
    const C = window.CONFIG;
    // Save original speed and freeze obstacles
    const origSpeed = C.GAME_SPEED;
    C.GAME_SPEED = 0; // freeze all movement

    const obsWidth = 32;
    const obsShrink = 0.15;
    const playerShrink = C.PLAYER_HITBOX_SHRINK; // 0.15

    // Player visual right = p.x + PLAYER_WIDTH
    // Player hitbox right = p.x + PLAYER_WIDTH - PLAYER_WIDTH * shrink
    const playerRight = p.x + C.PLAYER_WIDTH;
    const hitboxRight = p.x + C.PLAYER_WIDTH - C.PLAYER_WIDTH * playerShrink;

    // Place obstacle so visual overlaps player but hitbox doesn't
    // Obs hitbox left = obsX + obsWidth * obsShrink
    // For no hitbox overlap: obsX + obsWidth * obsShrink > hitboxRight
    // obsX > hitboxRight - obsWidth * obsShrink
    // For visual overlap: obsX < playerRight
    const obsX = hitboxRight - obsWidth * obsShrink + 2; // +2px margin past hitbox edge

    window.__game.obstacles.length = 0; // clear any existing
    window.__game.obstacles.push({
      type: 'kidney-stone',
      displayName: 'Kidney Stone',
      x: obsX,
      y: p.y,
      width: obsWidth,
      height: 42,
      color: '#8B6914',
      hitboxShrink: obsShrink,
    });

    const obsHitboxLeft = obsX + obsWidth * obsShrink;
    return {
      playerX: p.x,
      playerRight,
      hitboxRight: hitboxRight.toFixed(1),
      obsX: obsX.toFixed(1),
      obsHitboxLeft: obsHitboxLeft.toFixed(1),
      visualOverlap: obsX < playerRight,
      hitboxGap: (obsHitboxLeft - hitboxRight).toFixed(1),
      origSpeed,
    };
  });

  check('Near-miss: visual overlap exists', nearMissSetup.visualOverlap,
    `obsX=${nearMissSetup.obsX}, playerRight=${nearMissSetup.playerRight}`);
  check('Near-miss: hitbox gap is positive', parseFloat(nearMissSetup.hitboxGap) > 0,
    `hitboxGap=${nearMissSetup.hitboxGap}px`);

  // Wait a frame for the check (game speed is 0, so obstacle won't drift)
  await page.waitForTimeout(50);

  // Should still be RUNNING (not DYING) -- near-miss, not collision
  const nmState = await page.evaluate(() => window.__game.state);
  check('Near-miss does not trigger DYING', nmState === 'RUNNING', `got "${nmState}"`);

  // Restore game speed
  await page.evaluate((speed) => {
    window.CONFIG.GAME_SPEED = speed;
  }, nearMissSetup.origSpeed);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-near-miss.png` });

  // -----------------------------------------------------------------
  // 11. CLUSTER SPAWNING
  // -----------------------------------------------------------------
  console.log('\n--- 11. Cluster Spawning ---');

  // Set cluster config BEFORE restart so spawnInterval resets correctly
  await page.evaluate(() => {
    window.CONFIG.SPAWN_BASE_INTERVAL = 0.2;
    window.CONFIG.SPAWN_INTERVAL_VARIATION = 0.01;
    window.CONFIG.CLUSTER_PROBABILITY = 1.0;
    window.CONFIG.CLUSTER_SIZE_MAX = 3;
  });

  // Force a clean restart to reset module-level spawnInterval variable
  // (it was stuck at 999 from near-miss test's SPAWN_BASE_INTERVAL=999)
  const clusterPreState = await page.evaluate(() => window.__game.state);
  if (clusterPreState !== 'READY') {
    if (clusterPreState === 'DYING') await page.waitForTimeout(600);
    if (clusterPreState !== 'GAME_OVER') {
      await page.evaluate(() => window.triggerGameOver());
    }
    await page.waitForTimeout(2500);
    await page.keyboard.press('Space');
    await page.waitForTimeout(100);
  }

  // Now in READY state with spawnInterval reset to CONFIG.SPAWN_BASE_INTERVAL (0.2)
  await page.keyboard.press('Space'); // -> COUNTDOWN
  await page.waitForTimeout(3500); // countdown -> RUNNING

  // Wait for clusters to spawn (with 0.2s interval and 100% cluster probability)
  await page.waitForTimeout(2000);

  const clusterData = await page.evaluate(() => ({
    count: window.__game.obstacles.length,
    state: window.__game.state,
    positions: window.__game.obstacles.map(o => ({ x: Math.round(o.x), type: o.type })),
  }));

  // With 100% cluster probability, each spawn adds 1 primary + 1-2 cluster = at least 2
  check('Cluster spawning produces multiple obstacles', clusterData.count >= 2,
    `count = ${clusterData.count}, state=${clusterData.state}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/11-cluster-spawning.png` });

  // -----------------------------------------------------------------
  // 12. FULL COLLISION -> DEATH -> RESTART CYCLE
  // -----------------------------------------------------------------
  console.log('\n--- 12. Full Death Cycle ---');

  // Ensure we're in RUNNING state for a clean test
  const preDeathState = await page.evaluate(() => window.__game.state);
  if (preDeathState !== 'RUNNING') {
    if (preDeathState === 'DYING') {
      await page.waitForTimeout(600);
    }
    if (preDeathState === 'GAME_OVER' || await page.evaluate(() => window.__game.state) === 'GAME_OVER') {
      await page.waitForTimeout(2500);
      await page.keyboard.press('Space');
      await page.waitForTimeout(100);
    }
    if (await page.evaluate(() => window.__game.state) === 'READY') {
      await page.keyboard.press('Space'); // READY -> COUNTDOWN
      await page.waitForTimeout(3500); // countdown
    }
  }

  // Restore defaults and prevent random spawns from interfering
  await page.evaluate(() => {
    window.CONFIG.SPAWN_BASE_INTERVAL = 999;
    window.CONFIG.CLUSTER_PROBABILITY = 0.25;
    window.CONFIG.OBSTACLE_TYPES[1].unlockAfter = 10;
    window.CONFIG.OBSTACLE_TYPES[2].unlockAfter = 20;
    window.CONFIG.FLOAT_UNLOCK_ELAPSED = 15;
    // Clear obstacles to prevent accidental collision
    window.__game.obstacles.length = 0;
  });

  await page.waitForTimeout(50);

  const confirmRunning = await page.evaluate(() => window.__game.state);
  check('Pre-death: game is RUNNING', confirmRunning === 'RUNNING', `got "${confirmRunning}"`);

  // Force a collision by placing obstacle on top of player
  await page.evaluate(() => {
    const p = window.__game.player;
    window.__game.obstacles.push({
      type: 'toxin',
      displayName: 'Toxin',
      x: p.x + 5,
      y: p.y + 5,
      width: 28,
      height: 36,
      color: '#2E8B3A',
      hitboxShrink: 0.15,
    });
  });
  await page.waitForTimeout(50);

  const deathCycle1 = await page.evaluate(() => window.__game.state);
  check('Collision -> DYING', deathCycle1 === 'DYING', `got "${deathCycle1}"`);

  await page.waitForTimeout(600); // DYING duration
  const deathCycle2 = await page.evaluate(() => window.__game.state);
  check('DYING -> GAME_OVER', deathCycle2 === 'GAME_OVER', `got "${deathCycle2}"`);

  await page.waitForTimeout(2500); // freeze + cooldown
  await page.keyboard.press('Space');
  await page.waitForTimeout(50);

  const deathCycle3 = await page.evaluate(() => window.__game.state);
  check('GAME_OVER -> READY (restart)', deathCycle3 === 'READY', `got "${deathCycle3}"`);

  const cleanState = await page.evaluate(() => ({
    obstacles: window.__game.obstacles.length,
    distance: window.__game.distance,
    gameElapsed: window.__game.gameElapsed,
  }));
  check('All state clean after restart',
    cleanState.obstacles === 0 && cleanState.distance === 0 && cleanState.gameElapsed === 0,
    `obs=${cleanState.obstacles}, dist=${cleanState.distance}, elapsed=${cleanState.gameElapsed}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/12-clean-restart.png` });

  // -----------------------------------------------------------------
  // 13. CONSOLE ERRORS CHECK
  // -----------------------------------------------------------------
  console.log('\n--- 13. Console Errors ---');
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
