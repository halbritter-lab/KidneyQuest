// player.js -- Player entity with full jump physics for KidneyQuest
// Factory function pattern (not class) for workshop-friendly code.
// All physics values read from CONFIG so participants can tune in browser console.

import CONFIG from './config.js';

// Animation state definitions -- internal to player.js only.
// frames: how many frames exist for this state
// fps:    playback speed
// loop:   true = cycle continuously, false = hold last frame (one-shot)
const ANIM_STATES = {
  idle:       { frames: 4, fps: 8,  loop: true  },
  run:        { frames: 6, fps: 12, loop: true  },
  jump:       { frames: 2, fps: 4,  loop: false },
  fall:       { frames: 2, fps: 4,  loop: true  },
  land:       { frames: 3, fps: 16, loop: false },
  doubleJump: { frames: 2, fps: 6,  loop: false },
};

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
 * Determines and updates animState based on physics, then advances the frame counter.
 * 'land' is driven by ANIM_STATES frame count (one-shot): after last frame, transitions to run/idle.
 * All other one-shot states (jump, doubleJump) hold on last frame until physics changes state.
 * Looping states cycle continuously.
 *
 * @param {Object} player
 * @param {number} deltaTime
 */
function updateAnimState(player, deltaTime) {
  const prevState = player.animState;

  // Guard: if animState is not recognised, default to 'idle' to prevent crashes
  if (!ANIM_STATES[player.animState]) {
    player.animState = 'idle';
  }

  // -------------------------------------------------------------------------
  // State transition logic
  // -------------------------------------------------------------------------
  if (player.animState === 'land') {
    // 'land' is a one-shot driven by its frame count in ANIM_STATES.
    // The frame advancement below will reach the last frame; once it has
    // been displayed for at least one frame-duration, transition out.
    // We detect "played fully" by checking if we're on the last frame
    // and accumulated time exceeds one frame period.
    const anim = ANIM_STATES.land;
    if (
      player.animFrame >= anim.frames - 1 &&
      player.animTime >= 1 / anim.fps
    ) {
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

  // Reset animation when state changes (prevents frame bleeding -- Pitfall 4)
  if (player.animState !== prevState) {
    player.animFrame = 0;
    player.animTime = 0;
  }

  // -------------------------------------------------------------------------
  // Frame advancement
  // -------------------------------------------------------------------------
  const anim = ANIM_STATES[player.animState];

  if (anim) {
    player.animTime += deltaTime;

    // Advance one frame each time enough time has elapsed for one frame period
    if (player.animTime >= 1 / anim.fps) {
      player.animTime -= 1 / anim.fps;  // preserve remainder for smooth timing
      player.animFrame++;

      if (anim.loop) {
        // Looping: wrap back to frame 0
        player.animFrame %= anim.frames;
      } else {
        // One-shot: clamp to last frame, do not wrap
        if (player.animFrame >= anim.frames) {
          player.animFrame = anim.frames - 1;
        }
      }
    }
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
