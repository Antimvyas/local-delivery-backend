import Sound from "react-native-sound";

// Enable playback in silence mode
Sound.setCategory("Playback");

let notificationSound = null;

export const playNotificationSound = () => {
  // If sound is already playing, stop and release it first
  stopNotificationSound();

  const { Platform } = require('react-native');
  const soundFile = Platform.OS === 'android' ? 'notify' : 'notify.mp3';

  notificationSound = new Sound(soundFile, Sound.MAIN_BUNDLE, (error) => {
    if (error) {
      console.log(`❌ Failed to load sound ${soundFile}:`, error);
      return;
    }
    // Loop the sound for persistent alerts
    notificationSound.setNumberOfLoops(-1);
    notificationSound.play((success) => {
      if (!success) {
        console.log("❌ Sound playback failed");
      }
    });
  });
};

export const stopNotificationSound = () => {
  if (notificationSound) {
    try {
      notificationSound.stop();
      notificationSound.release();
    } catch (err) {
      console.log("❌ Error releasing sound:", err);
    }
    notificationSound = null;
  }
};
