import { Audio } from 'expo-av';

let currentSound = null;
let audioChunkBuffer = [];

/**
 * Buffer a base64 PCM16 audio chunk.
 * Call flushAudioBuffer() when all chunks are received to play.
 */
export function bufferPCM16Chunk(base64Data) {
  if (base64Data) {
    audioChunkBuffer.push(base64Data);
  }
}

/**
 * Flush the buffered PCM16 chunks: merge them into a single WAV and play.
 */
export async function flushAudioBuffer() {
  if (audioChunkBuffer.length === 0) return;

  // Merge all base64 chunks
  const mergedBase64 = audioChunkBuffer.join('');
  audioChunkBuffer = [];

  try {
    await playPCM16Base64(mergedBase64);
  } catch (err) {
    console.error('Failed to flush audio buffer:', err);
  }
}

/**
 * Clear the buffer without playing (e.g., when interrupted).
 */
export function clearAudioBuffer() {
  audioChunkBuffer = [];
}

/**
 * Play a full PCM16 base64 string as a WAV.
 */
export async function playPCM16Base64(base64Data, sampleRate = 24000) {
  try {
    // Stop any currently playing sound first
    await stopPlayback();

    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const binaryStr = atob(base64Data);
    const dataLen = binaryStr.length;
    const channels = 1;
    const byteRate = sampleRate * channels * 2;
    const blockAlign = channels * 2;

    const buffer = new ArrayBuffer(44 + dataLen);
    const view = new DataView(buffer);

    // RIFF header
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataLen, true);
    writeString(view, 8, 'WAVE');

    // fmt sub-chunk
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);    // PCM
    view.setUint16(22, channels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true);   // 16-bit

    // data sub-chunk
    writeString(view, 36, 'data');
    view.setUint32(40, dataLen, true);

    // Copy PCM data
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < dataLen; i++) {
      bytes[44 + i] = binaryStr.charCodeAt(i);
    }

    // Convert to base64 URI
    let str = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      str += String.fromCharCode(bytes[i]);
    }
    const uri = `data:audio/wav;base64,${btoa(str)}`;

    const { sound } = await Audio.Sound.createAsync({ uri });
    currentSound = sound;

    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.didJustFinish) {
        sound.unloadAsync();
        if (currentSound === sound) currentSound = null;
      }
    });

    await sound.playAsync();
  } catch (err) {
    console.error('Failed to play pcm16 base64:', err);
  }
}

export async function stopPlayback() {
  if (currentSound) {
    try {
      await currentSound.stopAsync();
      await currentSound.unloadAsync();
    } catch (e) {}
    currentSound = null;
  }
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}
