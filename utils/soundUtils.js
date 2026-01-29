import { createAudioPlayer } from 'expo-audio';

// Import sound files statically (require needs static paths in React Native)
// Initialize as null to ensure they're always defined
let TransferSound = null;
let DepositSound = null;
let WithdrawalSound = null;

// Try to load sound files, but don't fail if they can't be loaded
try {
  TransferSound = require('../assets/sounds/Transfer.wav');
} catch (e) {
  // File might not be available in some environments
  console.warn('Could not load Transfer.wav:', e.message || e);
}

try {
  DepositSound = require('../assets/sounds/Deposit.wav');
} catch (e) {
  console.warn('Could not load Deposit.wav:', e.message || e);
}

try {
  WithdrawalSound = require('../assets/sounds/Withdrawal.wav');
} catch (e) {
  console.warn('Could not load Withdrawal.wav:', e.message || e);
}

/**
 * Plays a sound effect from the assets/sounds directory
 * @param {object} soundFile - The sound file imported via require
 * @returns {Promise<void>}
 */
const playSoundFile = async (soundFile) => {
  if (!soundFile) {
    return;
  }

  try {
    // Create a new audio player
    const player = createAudioPlayer(soundFile);

    // Play the sound
    player.play();

    // Clean up the player after playback completes
    // Use a timeout to remove the player after a reasonable duration
    // This ensures resources are freed even if the sound is short
    setTimeout(() => {
      try {
        if (player) {
          player.remove();
        }
      } catch (e) {
        // Player might already be removed or in an invalid state
        console.warn('Error removing audio player:', e.message || e);
      }
    }, 3000); // Remove after 3 seconds (should be enough for most sound effects)
  } catch (error) {
    // Silently fail if sound can't be played
    console.warn('Failed to play sound:', error.message || error);
  }
};

/**
 * Plays the transfer success sound
 */
export const playTransferSound = () => {
  try {
    if (TransferSound) {
      playSoundFile(TransferSound);
    }
  } catch (error) {
    console.warn('Error in playTransferSound:', error.message || error);
  }
};

/**
 * Plays the deposit success sound
 */
export const playDepositSound = () => {
  try {
    if (DepositSound) {
      playSoundFile(DepositSound);
    }
  } catch (error) {
    console.warn('Error in playDepositSound:', error.message || error);
  }
};

/**
 * Plays the withdrawal success sound
 */
export const playWithdrawalSound = () => {
  try {
    if (WithdrawalSound) {
      playSoundFile(WithdrawalSound);
    }
  } catch (error) {
    console.warn('Error in playWithdrawalSound:', error.message || error);
  }
};
