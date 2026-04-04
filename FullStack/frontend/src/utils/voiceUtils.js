// src/utils/voiceUtil.js (WEB ONLY)
let recognition = null;

export const startVoiceDictation = async (onResult, onStart, onEnd) => {
  console.log('🔍 Checking for browser Speech API support...');
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  
  if (!SpeechRecognition) {
    console.error('❌ Browser does not support SpeechRecognition.');
    alert('Voice dictation is not supported in this browser. Please use Chrome or Edge.');
    if (onEnd) onEnd();
    return;
  }

  try {
    console.log('🗣️ Requesting raw microphone permissions from user...');
    // 📍 THE WAKE-UP CALL: Force the browser to show the "Ask Permission" popup
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    console.log('✅ Permission granted! Stopping raw stream and spinning up Speech Engine.');
    // As soon as they click "Allow", we stop this raw stream because the Speech engine needs the mic
    stream.getTracks().forEach(track => track.stop());

    // Now start the actual Speech Recognition
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true; // This makes it fire results AS you speak

    recognition.onstart = () => {
      console.log('🎤 Mic is hot. Listening for human voice...');
      if (onStart) onStart();
    };

    recognition.onerror = (event) => {
      console.error('🛑 Speech recognition error triggered. Type:', event.error);
      
      if (event.error === 'not-allowed') {
        alert('Microphone access denied. You must allow access to use voice dictation.');
      }
      if (onEnd) onEnd();
    };

    recognition.onend = () => {
      console.log('🔇 Mic stopped listening (Engine auto-closed or user stopped it).');
      if (onEnd) onEnd();
    };

    recognition.onresult = (e) => {
      console.log('--------------------------------------------------');
      console.log(`🧠 Speech Event Fired! Processing ${e.results.length} total audio chunks. Starting loop at index: ${e.resultIndex}`);
      
      let currentTranscript = '';
      
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunkText = e.results[i][0].transcript;
        const confidenceScore = e.results[i][0].confidence;
        const isFinal = e.results[i].isFinal;
        
        console.log(`   -> Chunk [${i}]: "${chunkText}"`);
        console.log(`   -> Confidence: ${(confidenceScore * 100).toFixed(2)}% | Is Final Guess? ${isFinal}`);
        
        currentTranscript += chunkText;
      }
      
      console.log(`📝 Final assembled string sent to UI: "${currentTranscript}"`);
      console.log('--------------------------------------------------');
      
      if (onResult) onResult([currentTranscript]);
    };

    recognition.start();

  } catch (err) {
    // This catches the error if they click "Block" on the initial popup or have no hardware
    console.warn('⚠️ Microphone permission rejected or hardware missing:', err);
    alert('Microphone access is required to use voice typing.');
    if (onEnd) onEnd();
  }
};

export const stopVoiceDictation = async () => {
  console.log('🛑 Force stopping voice dictation...');
  if (recognition) recognition.stop();
};

export const destroyVoiceDictation = async () => {
  console.log('💣 Destroying voice dictation instance...');
  if (recognition) recognition.abort();
};