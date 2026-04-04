// src/utils/voiceUtil.native.js (IOS/ANDROID ONLY)
import Voice from '@react-native-voice/voice';

export const startVoiceDictation = async (onResult, onStart, onEnd) => {
  Voice.onSpeechStart = onStart;
  Voice.onSpeechEnd = onEnd;
  Voice.onSpeechError = (e) => {
    console.warn('Voice Error:', e.error);
    if (onEnd) onEnd();
  };
  
  Voice.onSpeechResults = (e) => {
    if (e.value && e.value.length > 0) {
      onResult(e.value);
    }
  };

  try {
    await Voice.start('en-US'); // Change this locale string if you need it in another language
  } catch (error) {
    console.error('Failed to start voice', error);
    if (onEnd) onEnd();
  }
};

export const stopVoiceDictation = async () => {
  try {
    await Voice.stop();
  } catch (error) {
    console.error(error);
  }
};

export const destroyVoiceDictation = async () => {
  try {
    await Voice.destroy();
    Voice.removeAllListeners();
  } catch (error) {
    console.error(error);
  }
};