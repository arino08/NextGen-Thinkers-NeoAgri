import { Audio } from 'expo-av';

export async function startRecording() {
  try {
    await Audio.requestPermissionsAsync();
    
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentLockedModeIOS: true,
      shouldDuckAndroid: true,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });

    const customRecordingOptions = {
      isMeteringEnabled: true,
      android: {
        extension: '.wav',
        outputFormat: Audio.RECORDING_OPTION_ANDROID_OUTPUT_FORMAT_DEFAULT,
        audioEncoder: Audio.RECORDING_OPTION_ANDROID_AUDIO_ENCODER_DEFAULT,
        sampleRate: 24000,
        numberOfChannels: 1,
        bitRate: 128000,
      },
      ios: {
        extension: '.wav',
        audioQuality: Audio.RECORDING_OPTION_IOS_AUDIO_QUALITY_HIGH,
        sampleRate: 24000,
        numberOfChannels: 1,
        bitRate: 128000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
      web: {
        mimeType: 'audio/webm',
        bitsPerSecond: 128000,
      },
    };

    const { recording } = await Audio.Recording.createAsync(customRecordingOptions);
    const uri = recording.getURI();

    return { recording, uri };
  } catch (err) {
    console.error('Failed to start recording', err);
    throw err;
  }
}

export async function stopRecording(recording) {
  try {
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    const status = await recording.getStatusAsync();
    return { uri, durationMs: status.durationMillis };
  } catch (err) {
    console.error('Failed to stop recording', err);
    throw err;
  }
}

export async function getAmplitude(recording) {
  if (!recording) return 0;
  try {
    const status = await recording.getStatusAsync();
    if (status.isRecording && status.isMeteringEnabled && status.metering !== undefined) {
      const minDb = -60;
      const db = Math.max(status.metering, minDb);
      const linear = Math.pow(10, db / 20);
      const ref = Math.pow(10, 0 / 20); // 0 dB
      return linear / ref;
    }
  } catch (err) {
    // Ignore error if recording is already stopped
  }
  return 0;
}
