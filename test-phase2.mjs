// Playwright visual evaluation for Phase 2: Player + Physics
// Evaluates as a senior game designer would: feel, visuals, animation, mechanics

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const SCREENSHOTS_DIR = './.playwright/phase2';
mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const URL = 'http://localhost:8080';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  // Collect console errors
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', err => consoleErrors.push(err.message));

  console.log('=== Phase 2: Senior Game Designer Evaluation ===\n');

  // ---------------------------------------------------------------
  // 1. START SCREEN
  // ---------------------------------------------------------------
  console.log('--- 1. Start Screen ---');
  await page.goto(URL);
  await page.waitForTimeout(1500); // let pulsing animation cycle
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-start-screen.png` });
  console.log('  Screenshot: 01-start-screen.png');

  // Check canvas exists and has correct dimensions
  const canvasBox = await page.evaluate(() => {
    const c = document.getElementById('game-canvas');
    return c ? { w: c.width, h: c.height, exists: true } : { exists: false };
  });
  console.log(`  Canvas exists: ${canvasBox.exists}`);
  console.log(`  Canvas internal size: ${canvasBox.w}x${canvasBox.h}`);

  // ---------------------------------------------------------------
  // 2. GAME START — Press Space, zebra appears
  // ---------------------------------------------------------------
  console.log('\n--- 2. Game Start (Space to begin) ---');
  await page.focus('#game-canvas');
  await page.keyboard.press('Space');
  await page.waitForTimeout(500); // let player render
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-game-started-zebra-idle.png` });
  console.log('  Screenshot: 02-game-started-zebra-idle.png');

  // Check game state transitioned
  const gameState1 = await page.evaluate(() => {
    // gameState is a local var in main.js module scope, but we can check CONFIG presence
    return { configAvailable: typeof window.CONFIG !== 'undefined' };
  });
  console.log(`  CONFIG available globally: ${gameState1.configAvailable}`);

  // ---------------------------------------------------------------
  // 3. FIRST JUMP — smooth gravity arc
  // ---------------------------------------------------------------
  console.log('\n--- 3. First Jump ---');
  await page.keyboard.press('Space');
  await page.waitForTimeout(150); // capture mid-air
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-jump-ascending.png` });
  console.log('  Screenshot: 03-jump-ascending.png (mid-air, ascending)');

  await page.waitForTimeout(250); // near peak
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-jump-peak.png` });
  console.log('  Screenshot: 04-jump-peak.png (near peak)');

  await page.waitForTimeout(350); // falling
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-jump-falling.png` });
  console.log('  Screenshot: 05-jump-falling.png (falling back down)');

  await page.waitForTimeout(400); // landed
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/06-jump-landed.png` });
  console.log('  Screenshot: 06-jump-landed.png (landed, squash visible?)');

  // ---------------------------------------------------------------
  // 4. DOUBLE JUMP
  // ---------------------------------------------------------------
  console.log('\n--- 4. Double Jump ---');
  await page.keyboard.press('Space');
  await page.waitForTimeout(200);
  await page.keyboard.press('Space'); // double jump mid-air
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/07-double-jump.png` });
  console.log('  Screenshot: 07-double-jump.png (double jump spin?)');

  await page.waitForTimeout(800); // wait to land
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/08-after-double-jump-land.png` });
  console.log('  Screenshot: 08-after-double-jump-land.png');

  // ---------------------------------------------------------------
  // 5. VARIABLE JUMP HEIGHT — short tap vs hold
  // ---------------------------------------------------------------
  console.log('\n--- 5. Variable Jump Height ---');

  // Short tap
  await page.waitForTimeout(300);
  await page.keyboard.down('Space');
  await page.waitForTimeout(30); // very short press
  await page.keyboard.up('Space');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/09-short-hop.png` });
  console.log('  Screenshot: 09-short-hop.png (should be low jump)');

  await page.waitForTimeout(600); // wait to land

  // Long hold
  await page.keyboard.down('Space');
  await page.waitForTimeout(500); // hold for 500ms
  await page.keyboard.up('Space');
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/10-full-jump.png` });
  console.log('  Screenshot: 10-full-jump.png (should be higher)');

  await page.waitForTimeout(800); // land

  // ---------------------------------------------------------------
  // 6. HORIZONTAL MOVEMENT — ArrowLeft/ArrowRight + zone bounce
  // ---------------------------------------------------------------
  console.log('\n--- 6. Horizontal Movement ---');

  // Move left
  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/11-moving-left.png` });
  console.log('  Screenshot: 11-moving-left.png');
  await page.keyboard.up('ArrowLeft');

  await page.waitForTimeout(200);

  // Move right
  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/12-moving-right.png` });
  console.log('  Screenshot: 12-moving-right.png');
  await page.keyboard.up('ArrowRight');

  await page.waitForTimeout(300);

  // ---------------------------------------------------------------
  // 7. TRIPLE JUMP PREVENTION
  // ---------------------------------------------------------------
  console.log('\n--- 7. Triple Jump Prevention ---');
  await page.keyboard.press('Space'); // jump 1
  await page.waitForTimeout(150);
  await page.keyboard.press('Space'); // jump 2 (double)
  await page.waitForTimeout(150);
  await page.keyboard.press('Space'); // jump 3 (should NOT work)
  await page.waitForTimeout(100);
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/13-no-triple-jump.png` });
  console.log('  Screenshot: 13-no-triple-jump.png (should still be in air, no extra height)');

  await page.waitForTimeout(800);

  // ---------------------------------------------------------------
  // 8. CONFIG TUNABILITY — modify at runtime
  // ---------------------------------------------------------------
  console.log('\n--- 8. Runtime CONFIG Tuning ---');
  const configCheck = await page.evaluate(() => {
    const c = window.CONFIG;
    return {
      GRAVITY: c.GRAVITY,
      JUMP_VELOCITY: c.JUMP_VELOCITY,
      PLAYER_WIDTH: c.PLAYER_WIDTH,
      PLAYER_HEIGHT: c.PLAYER_HEIGHT,
      PLAYER_X_DEFAULT: c.PLAYER_X_DEFAULT,
      JUMP_CUT_MULTIPLIER: c.JUMP_CUT_MULTIPLIER,
      FALL_GRAVITY_MULT: c.FALL_GRAVITY_MULT,
      COYOTE_TIME: c.COYOTE_TIME,
      DOUBLE_JUMP_MULT: c.DOUBLE_JUMP_MULT,
      PLAYER_MOVE_SPEED: c.PLAYER_MOVE_SPEED,
      PLAYER_BOUNCE_FORCE: c.PLAYER_BOUNCE_FORCE,
      TOUCH_JUMP_SHORT_MS: c.TOUCH_JUMP_SHORT_MS,
    };
  });
  console.log('  CONFIG values:');
  for (const [k, v] of Object.entries(configCheck)) {
    console.log(`    ${k}: ${v}`);
  }

  // ---------------------------------------------------------------
  // 9. PIXEL ANALYSIS — Is there a zebra or just a green rectangle?
  // ---------------------------------------------------------------
  console.log('\n--- 9. Zebra Visual Analysis ---');

  // Get a clean frame with player idle on ground
  await page.waitForTimeout(500);

  const pixelAnalysis = await page.evaluate(() => {
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Sample area around where the player should be (~320, ~520 in CSS coords)
    const playerX = Math.round(window.CONFIG.PLAYER_X_DEFAULT * dpr);
    const playerY = Math.round((window.CONFIG.GROUND_Y - window.CONFIG.PLAYER_HEIGHT) * dpr);
    const pw = Math.round(window.CONFIG.PLAYER_WIDTH * dpr);
    const ph = Math.round(window.CONFIG.PLAYER_HEIGHT * dpr);

    const imageData = ctx.getImageData(playerX, playerY, pw, ph);
    const data = imageData.data;

    // Count unique colors in the player area (more colors = likely zebra, not plain rect)
    const colorSet = new Set();
    let whiteCount = 0;
    let blackCount = 0;
    let greenCount = 0;
    let pinkCount = 0;
    let totalPixels = 0;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i+1], b = data[i+2], a = data[i+3];
      if (a < 10) continue; // skip transparent
      totalPixels++;

      const key = `${Math.floor(r/16)}-${Math.floor(g/16)}-${Math.floor(b/16)}`;
      colorSet.add(key);

      // Classify colors
      if (r > 200 && g > 200 && b > 200) whiteCount++;
      if (r < 50 && g < 50 && b < 50) blackCount++;
      if (g > 200 && r < 50 && b < 50) greenCount++;
      if (r > 180 && g < 130 && b < 130) pinkCount++;
    }

    return {
      totalPixels,
      uniqueColorBuckets: colorSet.size,
      whitePixels: whiteCount,
      blackPixels: blackCount,
      greenPixels: greenCount,
      pinkPixels: pinkCount,
      isLikelyZebra: (whiteCount > 10 && blackCount > 10) || colorSet.size > 5,
      isPlainGreenRect: greenCount > totalPixels * 0.8,
    };
  });

  console.log(`  Total non-transparent pixels in player area: ${pixelAnalysis.totalPixels}`);
  console.log(`  Unique color buckets: ${pixelAnalysis.uniqueColorBuckets}`);
  console.log(`  White pixels: ${pixelAnalysis.whitePixels}`);
  console.log(`  Black pixels: ${pixelAnalysis.blackPixels}`);
  console.log(`  Green pixels: ${pixelAnalysis.greenPixels}`);
  console.log(`  Pink pixels: ${pixelAnalysis.pinkPixels}`);
  console.log(`  Likely zebra (multi-color): ${pixelAnalysis.isLikelyZebra}`);
  console.log(`  Plain green rectangle: ${pixelAnalysis.isPlainGreenRect}`);

  // Take a final clean screenshot of the idle zebra
  await page.screenshot({ path: `${SCREENSHOTS_DIR}/14-zebra-idle-final.png` });
  console.log('  Screenshot: 14-zebra-idle-final.png');

  // ---------------------------------------------------------------
  // 10. CONSOLE ERRORS CHECK
  // ---------------------------------------------------------------
  console.log('\n--- 10. Console Errors ---');
  if (consoleErrors.length === 0) {
    console.log('  No console errors detected!');
  } else {
    console.log(`  ${consoleErrors.length} error(s):`);
    consoleErrors.forEach(e => console.log(`    ERROR: ${e}`));
  }

  // ---------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------
  console.log('\n=== EVALUATION SUMMARY ===\n');

  const issues = [];

  if (!canvasBox.exists) issues.push('Canvas not found');
  if (consoleErrors.length > 0) issues.push(`${consoleErrors.length} console error(s)`);
  if (pixelAnalysis.isPlainGreenRect) issues.push('Player appears to be plain green rectangle (zebra not rendering)');
  if (!pixelAnalysis.isLikelyZebra && !pixelAnalysis.isPlainGreenRect) issues.push('Player pixel analysis inconclusive');
  if (pixelAnalysis.totalPixels === 0) issues.push('No visible pixels in player area');

  if (issues.length === 0) {
    console.log('  ALL CHECKS PASSED');
  } else {
    console.log('  ISSUES FOUND:');
    issues.forEach(i => console.log(`    - ${i}`));
  }

  console.log(`\n  Screenshots saved to: ${SCREENSHOTS_DIR}/`);
  console.log('  Review screenshots for visual quality assessment.\n');

  await browser.close();
})();
