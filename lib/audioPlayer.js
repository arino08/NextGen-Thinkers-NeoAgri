import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

let activeSounds = [];

export async function playAudioUri(uri) {
  try {
    const { sound } = await Audio.Sound.createAsync({ uri });
    activeSounds.push(sound);
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
        activeSounds = activeSounds.filter((s) => s !== sound);
      }
    });
    await sound.playAsync();
    return sound;
  } catch (err) {
    console.error('Failed to play audio uri', err);
  }
}

export async function stopPlayback() {
  for (const sound of activeSounds) {
    try {
      await sound.stopAsync();
      await sound.unloadAsync();
    } catch (e) {
      console.warn('Error stopping sound', e);
    }
  }
  activeSounds = [];
}

export async function playPCM16Base64(base64Data, sampleRate = 24000) {
  try {
    // In a hackathon, OpenAI realtime API sends raw pcm16 base64. 
    // We construct a simple WAV header in JS to wrap the PCM16 data, 
    // convert it to a data URI, and let Expo play it.
    
    // We decode the base64 payload to get its byte length
    // atob is available in React Native globals
    const binaryStr = atob(base64Data);
    const dataLen = binaryStr.length;
    const channels = 1;
    const byteRate = sampleRate * channels * 2;
    const blockAlign = channels * 2;
    
    const buffer = new ArrayBuffer(44 + dataLen);
    const view = new DataView(buffer);
    
    // RIFF chunk descriptor
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLen, true);
    writeString(view, 8, 'WAVE');
    
    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); // Size of fmt chunk
    view.setUint16(20, 1, true); // Audio format (PCM)
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    
    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLen, true);
    
    // Append actual audio data
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < dataLen; i++) {
      bytes[44 + i] = binaryStr.charCodeAt(i);
    }
    
    // Encode the entire buffer (WAV header + PCM data) to base64
    let fullBase64 = '';
    // Process in chunks to avoid max call stack size with spread operator in btoa polyfills
    for (let i = 0; i < bytes.byteLength; i++) {
        fullBase64 += String.fromCharCode(bytes[i]);
    }
    const finalBase64 = btoa(fullBase64);

    const uri = `data:audio/wav;base64,${finalBase64}`;
    await playAudioUri(uri);
  } catch (err) {
    console.error('Failed to play pcm16 base64', err);
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
