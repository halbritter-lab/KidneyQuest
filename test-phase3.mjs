// Playwright automated verification for Phase 3: Game Loop + Scrolling
// Tests all 5 game states, transitions, config data, and ground scrolling.

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import http from 'http';
import fs from 'fs';
import path from 'path';

const SCREENSHOTS_DIR = './.playwright/phase3';
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const PORT = 8099;
const URL = `http://localhost:${PORT}`;

// ---------------------------------------------------------------------------
// Minimal static file server (ES modules need HTTP, not file://)
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

  console.log('\n=== Phase 3: Game Loop + Scrolling -- Automated Verification ===\n');

  // -----------------------------------------------------------------
  // 1. READY STATE
  // -----------------------------------------------------------------
  console.log('--- 1. READY State ---');
  await page.goto(URL);
  await page.waitForTimeout(500);

  const readyState = await page.evaluate(() => window.__game.state);
  check('Game starts in READY state', readyState === 'READY', `got "${readyState}"`);

  // Canvas exists
  const canvasInfo = await page.evaluate(() => {
    const c = document.getElementById('game-canvas');
    return c ? { exists: true, w: c.width, h: c.height } : { exists: false };
  });
  check('Canvas exists', canvasInfo.exists);

  // Ground scrolls slowly in READY
  const offset1 = await page.evaluate(() => window.__game.groundOffset);
  await page.waitForTimeout(300);
  const offset2 = await page.evaluate(() => window.__game.groundOffset);
  check('Ground scrolls in READY state', offset2 > offset1, `offset ${offset1.toFixed(1)} -> ${offset2.toFixed(1)}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-ready-state.png` });

  // -----------------------------------------------------------------
  // 2. CONFIG DATA VERIFICATION
  // -----------------------------------------------------------------
  console.log('\n--- 2. Config Data ---');

  const configData = await page.evaluate(() => {
    const C = window.CONFIG;
    return {
      geneCount: C.GENE_TYPES.length,
      obstacleCount: C.OBSTACLE_TYPES.length,
      allGenesValid: C.GENE_TYPES.every(g =>
        g.name && g.geneName && g.geneDescription && g.color && typeof g.points === 'number' && typeof g.spawnRate === 'number' && g.movement
      ),
      allObstaclesValid: C.OBSTACLE_TYPES.every(o =>
        o.name && typeof o.width === 'number' && typeof o.height === 'number' && o.color && typeof o.spawnRate === 'number' && o.movement
      ),
      geneNames: C.GENE_TYPES.map(g => g.name),
      obstacleNames: C.OBSTACLE_TYPES.map(o => o.name),
      countdownStep: C.COUNTDOWN_STEP,
      gameOverFreezeDelay: C.GAME_OVER_FREEZE_DELAY,
      gameOverCooldown: C.GAME_OVER_COOLDOWN,
      readyScrollSpeed: C.READY_SCROLL_SPEED,
      hudColor: C.HUD_COLOR,
    };
  });

  check('6 gene types defined', configData.geneCount === 6, `got ${configData.geneCount}`);
  check('3 obstacle types defined', configData.obstacleCount === 3, `got ${configData.obstacleCount}`);
  check('All genes have required fields', configData.allGenesValid);
  check('All obstacles have required fields', configData.allObstaclesValid);
  console.log(`  Gene names: ${configData.geneNames.join(', ')}`);
  console.log(`  Obstacle names: ${configData.obstacleNames.join(', ')}`);

  // -----------------------------------------------------------------
  // 3. COUNTDOWN STATE
  // -----------------------------------------------------------------
  console.log('\n--- 3. COUNTDOWN State ---');

  await page.focus('#game-canvas');
  await page.keyboard.press('Space');
  await page.waitForTimeout(50);

  const countdownState = await page.evaluate(() => ({
    state: window.__game.state,
    countdownValue: window.__game.countdownValue,
  }));
  check('Space transitions to COUNTDOWN', countdownState.state === 'COUNTDOWN', `got "${countdownState.state}"`);
  check('Countdown starts at 3', countdownState.countdownValue === 3, `got ${countdownState.countdownValue}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-countdown-3.png` });

  // Wait for countdown to progress (COUNTDOWN_STEP = 0.8s)
  await page.waitForTimeout(900);
  const mid = await page.evaluate(() => ({
    state: window.__game.state,
    countdownValue: window.__game.countdownValue,
  }));
  check('Countdown decrements', mid.countdownValue < 3, `value = ${mid.countdownValue}`);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-countdown-mid.png` });

  // Space during countdown should be ignored
  await page.keyboard.press('Space');
  const stillCountdown = await page.evaluate(() => window.__game.state);
  check('Space ignored during COUNTDOWN', stillCountdown === 'COUNTDOWN' || stillCountdown === 'RUNNING',
    `state = "${stillCountdown}"`);

  // Wait for countdown to finish (3 steps + Go! = ~3.2s total, minus time already waited)
  await page.waitForTimeout(2500);

  // -----------------------------------------------------------------
  // 4. RUNNING STATE
  // -----------------------------------------------------------------
  console.log('\n--- 4. RUNNING State ---');

  const runState = await page.evaluate(() => window.__game.state);
  check('Game transitions to RUNNING after countdown', runState === 'RUNNING', `got "${runState}"`);

  // Distance increases
  const dist1 = await page.evaluate(() => window.__game.distance);
  await page.waitForTimeout(500);
  const dist2 = await page.evaluate(() => window.__game.distance);
  check('Distance increases while RUNNING', dist2 > dist1, `${dist1.toFixed(1)} -> ${dist2.toFixed(1)}`);

  // Ground scrolls at game speed (faster than READY)
  const runOffset1 = await page.evaluate(() => window.__game.groundOffset);
  await page.waitForTimeout(200);
  const runOffset2 = await page.evaluate(() => window.__game.groundOffset);
  const runScrollRate = (runOffset2 - runOffset1) / 0.2;
  check('Ground scrolls at ~GAME_SPEED while RUNNING', runScrollRate > 100,
    `~${runScrollRate.toFixed(0)} px/s`);

  // HUD visible (distance > 0)
  const hudDist = await page.evaluate(() => window.__game.distance);
  check('Distance counter is positive', hudDist > 0, `${hudDist.toFixed(1)} px`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-running.png` });

  // Jump works
  const beforeJump = await page.evaluate(() => window.__game.player.isGrounded);
  await page.keyboard.press('Space');
  await page.waitForTimeout(100);
  const afterJump = await page.evaluate(() => ({
    isGrounded: window.__game.player.isGrounded,
    velocityY: window.__game.player.velocityY,
  }));
  check('Jump works in RUNNING state', !afterJump.isGrounded || afterJump.velocityY < 0,
    `grounded=${afterJump.isGrounded}, vy=${afterJump.velocityY.toFixed(0)}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-running-jump.png` });
  await page.waitForTimeout(800); // land

  // -----------------------------------------------------------------
  // 5. PAUSED STATE
  // -----------------------------------------------------------------
  console.log('\n--- 5. PAUSED State ---');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);

  const pauseState = await page.evaluate(() => window.__game.state);
  check('Escape transitions to PAUSED', pauseState === 'PAUSED', `got "${pauseState}"`);

  // Ground and distance frozen
  const pausedDist1 = await page.evaluate(() => window.__game.distance);
  const pausedOffset1 = await page.evaluate(() => window.__game.groundOffset);
  await page.waitForTimeout(300);
  const pausedDist2 = await page.evaluate(() => window.__game.distance);
  const pausedOffset2 = await page.evaluate(() => window.__game.groundOffset);
  check('Distance frozen while PAUSED', pausedDist2 === pausedDist1,
    `${pausedDist1.toFixed(3)} -> ${pausedDist2.toFixed(3)}`);
  check('Ground offset frozen while PAUSED', pausedOffset2 === pausedOffset1,
    `${pausedOffset1.toFixed(3)} -> ${pausedOffset2.toFixed(3)}`);

  // Space ignored during PAUSED
  await page.keyboard.press('Space');
  const stillPaused = await page.evaluate(() => window.__game.state);
  check('Space ignored during PAUSED', stillPaused === 'PAUSED', `got "${stillPaused}"`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-paused.png` });

  // -----------------------------------------------------------------
  // 6. RESUME FROM PAUSED
  // -----------------------------------------------------------------
  console.log('\n--- 6. Resume from PAUSED ---');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(50);
  const resumeState = await page.evaluate(() => window.__game.state);
  check('Escape resumes to RUNNING', resumeState === 'RUNNING', `got "${resumeState}"`);

  // Distance starts increasing again
  const resumeDist1 = await page.evaluate(() => window.__game.distance);
  await page.waitForTimeout(300);
  const resumeDist2 = await page.evaluate(() => window.__game.distance);
  check('Distance increases after resume', resumeDist2 > resumeDist1,
    `${resumeDist1.toFixed(1)} -> ${resumeDist2.toFixed(1)}`);

  // No huge delta jump (distance increase should be reasonable, not > 1000px in 300ms)
  const deltaIncrease = resumeDist2 - resumeDist1;
  check('No huge delta jump on resume', deltaIncrease < 200,
    `delta = ${deltaIncrease.toFixed(1)} px in 300ms`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-resumed.png` });

  // -----------------------------------------------------------------
  // 7. P KEY ALSO PAUSES
  // -----------------------------------------------------------------
  console.log('\n--- 7. P Key Pause ---');

  await page.keyboard.press('KeyP');
  await page.waitForTimeout(50);
  const pPaused = await page.evaluate(() => window.__game.state);
  check('P key pauses the game', pPaused === 'PAUSED', `got "${pPaused}"`);

  await page.keyboard.press('KeyP');
  await page.waitForTimeout(50);
  const pResumed = await page.evaluate(() => window.__game.state);
  check('P key resumes the game', pResumed === 'RUNNING', `got "${pResumed}"`);

  // -----------------------------------------------------------------
  // 8. GAME_OVER STATE
  // -----------------------------------------------------------------
  console.log('\n--- 8. GAME_OVER State ---');

  // Trigger game over via exposed function
  await page.evaluate(() => window.triggerGameOver());
  await page.waitForTimeout(50);

  const goState = await page.evaluate(() => ({
    state: window.__game.state,
    timer: window.__game.gameOverTimer,
  }));
  check('triggerGameOver sets GAME_OVER state', goState.state === 'GAME_OVER', `got "${goState.state}"`);

  // Ground frozen in GAME_OVER
  const goOffset1 = await page.evaluate(() => window.__game.groundOffset);
  await page.waitForTimeout(200);
  const goOffset2 = await page.evaluate(() => window.__game.groundOffset);
  check('Ground frozen in GAME_OVER', goOffset2 === goOffset1,
    `${goOffset1.toFixed(3)} -> ${goOffset2.toFixed(3)}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-game-over-flash.png` });

  // Space during freeze delay should be ignored
  await page.keyboard.press('Space');
  const stillGO1 = await page.evaluate(() => window.__game.state);
  check('Space ignored during freeze delay', stillGO1 === 'GAME_OVER', `got "${stillGO1}"`);

  // Wait past freeze delay (1.0s) but before cooldown ends (1.0 + 1.0 = 2.0s)
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-game-over-text.png` });

  // Space during cooldown should still be ignored
  await page.keyboard.press('Space');
  const stillGO2 = await page.evaluate(() => window.__game.state);
  check('Space ignored during cooldown', stillGO2 === 'GAME_OVER', `got "${stillGO2}"`);

  // Wait past cooldown
  await page.waitForTimeout(1200);
  const goTimer = await page.evaluate(() => window.__game.gameOverTimer);
  check('gameOverTimer exceeds freeze+cooldown', goTimer >= 2.0, `timer = ${goTimer.toFixed(2)}s`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-game-over-restart-prompt.png` });

  // -----------------------------------------------------------------
  // 9. RESTART FROM GAME_OVER
  // -----------------------------------------------------------------
  console.log('\n--- 9. Restart from GAME_OVER ---');

  await page.keyboard.press('Space');
  await page.waitForTimeout(50);

  const restartState = await page.evaluate(() => ({
    state: window.__game.state,
    distance: window.__game.distance,
  }));
  check('Space restarts to READY after cooldown', restartState.state === 'READY', `got "${restartState.state}"`);
  check('Distance resets on restart', restartState.distance === 0, `got ${restartState.distance}`);

  await page.screenshot({ path: `${SCREENSHOTS_DIR}/11-restarted-ready.png` });

  // -----------------------------------------------------------------
  // 10. FULL CYCLE: READY -> COUNTDOWN -> RUNNING -> GAME_OVER -> READY
  // -----------------------------------------------------------------
  console.log('\n--- 10. Full Cycle ---');

  // Start fresh from READY
  await page.keyboard.press('Space'); // -> COUNTDOWN
  await page.waitForTimeout(50);
  const cycle1 = await page.evaluate(() => window.__game.state);
  check('Cycle: READY -> COUNTDOWN', cycle1 === 'COUNTDOWN', `got "${cycle1}"`);

  await page.waitForTimeout(3500); // wait for countdown to finish
  const cycle2 = await page.evaluate(() => window.__game.state);
  check('Cycle: COUNTDOWN -> RUNNING', cycle2 === 'RUNNING', `got "${cycle2}"`);

  await page.evaluate(() => window.triggerGameOver());
  await page.waitForTimeout(50);
  const cycle3 = await page.evaluate(() => window.__game.state);
  check('Cycle: RUNNING -> GAME_OVER', cycle3 === 'GAME_OVER', `got "${cycle3}"`);

  await page.waitForTimeout(2500); // wait past freeze + cooldown
  await page.keyboard.press('Space');
  await page.waitForTimeout(50);
  const cycle4 = await page.evaluate(() => window.__game.state);
  check('Cycle: GAME_OVER -> READY (restart)', cycle4 === 'READY', `got "${cycle4}"`);

  // -----------------------------------------------------------------
  // 11. CONSOLE ERRORS CHECK
  // -----------------------------------------------------------------
  console.log('\n--- 11. Console Errors ---');
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
