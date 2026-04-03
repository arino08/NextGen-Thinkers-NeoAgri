import React, { useState, useEffect } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { startRecording, stopRecording, getAmplitude } from '../lib/audioRecorder';
import { playAudioUri, stopPlayback } from '../lib/audioPlayer';

export default function TestAudio() {
  const [recording, setRecording] = useState(null);
  const [uri, setUri] = useState('');
  const [amplitude, setAmplitude] = useState(0);

  useEffect(() => {
    let interval;
    if (recording) {
      interval = setInterval(async () => {
        const amp = await getAmplitude(recording);
        setAmplitude(amp);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [recording]);

  const handleStart = async () => {
    try {
      const { recording, uri } = await startRecording();
      setRecording(recording);
      setUri(uri);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStop = async () => {
    try {
      if (!recording) return;
      const { uri: finalUri } = await stopRecording(recording);
      setRecording(null);
      setUri(finalUri);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePlay = async () => {
    if (uri) {
      await playAudioUri(uri);
    }
  };

  return (
    <View style={styles.container}>
      <Text>Amplitude: {amplitude.toFixed(3)}</Text>
      <Text>URI: {uri}</Text>
      <Button title="Start Recording" onPress={handleStart} disabled={ git add package.json package-lock.json lib/audioPlayer.js && git commit -m "[A1] feat(audio): create audioPlayer with PCM16 base64 decode support"recording} />
      <Button title="Stop Recording" onPress={handleStop} disabled={!recording} />
      <Button title="Play Recording" onPress={handlePlay} disabled={!uri} />
      <Button title="Stop Playback" onPress={stopPlayback} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
});
