// player.js -- Player entity with full jump physics for KidneyQuest
// Factory function pattern (not class) for workshop-friendly code.
// All physics values read from CONFIG so participants can tune in browser console.

import CONFIG from './config.js';

/**
 * Creates a new player entity standing on the ground.
 *
 * @param {Object} config - Game CONFIG object
 * @returns {Object} Player state object
 */
export function createPlayer(config) {
  return {
    x: config.PLAYER_X_DEFAULT,
    y: config.GROUND_Y - config.PLAYER_HEIGHT,  // standing on ground
    velocityX: 0,
    velocityY: 0,
    isGrounded: true,
    jumpsRemaining: 2,        // 2 = both jumps available, 1 = used first, 0 = both used
    coyoteTimer: config.COYOTE_TIME,
    squashX: 1.0,
    squashY: 1.0,
    animState: 'idle',
    animFrame: 0,
    animTime: 0,
  };
}

/**
 * Updates the player's physics state for one frame.
 * Applies horizontal movement, gravity, ground collision, squash/stretch, and animation state.
 *
 * @param {Object} player - Player state object (mutated in place)
 * @param {number} deltaTime - Elapsed time in seconds (already capped at 0.1s by caller)
 */
export function updatePlayer(player, deltaTime) {
  // -------------------------------------------------------------------------
  // Horizontal movement
  // -------------------------------------------------------------------------
  player.x += player.velocityX * deltaTime;

  // Soft bounce at zone left edge
  if (player.x < CONFIG.PLAYER_MOVE_ZONE_LEFT) {
    player.velocityX = Math.abs(player.velocityX) * CONFIG.PLAYER_BOUNCE_FORCE;
    player.x = CONFIG.PLAYER_MOVE_ZONE_LEFT; // clamp to prevent escape on large deltaTime
  }

  // Soft bounce at zone right edge (right edge accounts for player width)
  if (player.x + CONFIG.PLAYER_WIDTH > CONFIG.PLAYER_MOVE_ZONE_RIGHT) {
    player.velocityX = -Math.abs(player.velocityX) * CONFIG.PLAYER_BOUNCE_FORCE;
    player.x = CONFIG.PLAYER_MOVE_ZONE_RIGHT - CONFIG.PLAYER_WIDTH; // clamp
  }

  // -------------------------------------------------------------------------
  // Vertical physics -- delta-time Euler integration
  // -------------------------------------------------------------------------
  const wasGrounded = player.isGrounded;

  if (!player.isGrounded) {
    // Asymmetric gravity: fall faster than rise for snappier feel
    const gravMult = player.velocityY > 0 ? CONFIG.FALL_GRAVITY_MULT : 1.0;
    player.velocityY += CONFIG.GRAVITY * gravMult * deltaTime;
  }

  player.y += player.velocityY * deltaTime;

  // -------------------------------------------------------------------------
  // Ground collision
  // -------------------------------------------------------------------------
  const groundContact = CONFIG.GROUND_Y - CONFIG.PLAYER_HEIGHT;

  if (player.y >= groundContact) {
    player.y = groundContact;
    player.velocityY = 0;
    player.isGrounded = true;
    player.jumpsRemaining = 2;
    player.coyoteTimer = CONFIG.COYOTE_TIME;

    // Landing squash -- only trigger on the frame of landing
    if (!wasGrounded) {
      player.squashX = 1.3;
      player.squashY = 0.7;
      player.animState = 'land';
      player.animFrame = 0;
      player.animTime = 0;
    }
  } else {
    player.isGrounded = false;
    // Tick down coyote timer while airborne
    player.coyoteTimer = Math.max(0, player.coyoteTimer - deltaTime);
  }

  // -------------------------------------------------------------------------
  // Squash/stretch spring back to neutral
  // -------------------------------------------------------------------------
  player.squashX += (1.0 - player.squashX) * 12 * deltaTime;
  player.squashY += (1.0 - player.squashY) * 12 * deltaTime;

  // -------------------------------------------------------------------------
  // Animation state
  // -------------------------------------------------------------------------
  updateAnimState(player, deltaTime);
}

/**
 * Determines and updates animState based on physics.
 * 'land' is a one-shot: plays for ~0.15 s then transitions to run/idle.
 *
 * @param {Object} player
 * @param {number} deltaTime
 */
function updateAnimState(player, deltaTime) {
  const prevState = player.animState;

  if (player.animState === 'land') {
    player.animTime += deltaTime;
    // One-shot: 0.15 s, then decide run vs idle
    if (player.animTime >= 0.15) {
      player.animState = Math.abs(player.velocityX) > 5 ? 'run' : 'idle';
      player.animFrame = 0;
      player.animTime = 0;
    }
  } else if (player.isGrounded) {
    player.animState = Math.abs(player.velocityX) > 5 ? 'run' : 'idle';
  } else if (!player.isGrounded && player.velocityY < 0 && player.jumpsRemaining === 1) {
    player.animState = 'jump';
  } else if (!player.isGrounded && player.velocityY < 0 && player.jumpsRemaining === 0) {
    player.animState = 'doubleJump';
  } else if (!player.isGrounded && player.velocityY >= 0) {
    player.animState = 'fall';
  }

  // Reset animation when state changes
  if (player.animState !== prevState) {
    player.animFrame = 0;
    player.animTime = 0;
  }
}

/**
 * Handles jump button press. Triggers first jump (with coyote time) or double jump.
 *
 * @param {Object} player - Player state object (mutated in place)
 */
export function handleJumpPress(player) {
  const canFirstJump = player.coyoteTimer > 0 && player.jumpsRemaining === 2;
  const canDoubleJump = player.jumpsRemaining === 1 && !player.isGrounded;

  if (canFirstJump) {
    player.velocityY = CONFIG.JUMP_VELOCITY;          // -650 px/s upward
    player.coyoteTimer = 0;
    player.jumpsRemaining = 1;
    player.isGrounded = false;
    player.animState = 'jump';
    player.animFrame = 0;
    player.animTime = 0;
  } else if (canDoubleJump) {
    player.velocityY = CONFIG.JUMP_VELOCITY * CONFIG.DOUBLE_JUMP_MULT;
    player.jumpsRemaining = 0;
    player.animState = 'doubleJump';
    player.animFrame = 0;
    player.animTime = 0;
  }
}

/**
 * Handles jump button release. Cuts the jump short for variable jump height.
 * Only acts while the player is still rising (velocityY < 0).
 *
 * @param {Object} player - Player state object (mutated in place)
 */
export function handleJumpRelease(player) {
  if (player.velocityY < 0) {
    player.velocityY *= CONFIG.JUMP_CUT_MULTIPLIER;
  }
}
