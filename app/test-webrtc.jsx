import React, { useState } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import { mediaDevices, RTCView } from 'react-native-webrtc';
import { fetchSessionToken } from '../lib/realtimeSession';
import { createPeerConnection, addAudioTrack, createOffer, setRemoteAnswer } from '../lib/peerConnection';
import { exchangeSDP } from '../lib/openaiHandshake';

export default function TestWebRTC() {
  const [status, setStatus] = useState('Disconnected');
  const [remoteStream, setRemoteStream] = useState(null);

  const startConnection = async () => {
    try {
      setStatus('Fetching token...');
      const session = await fetchSessionToken();

      setStatus('Getting microphone...');
      const stream = await mediaDevices.getUserMedia({ audio: true });

      setStatus('Creating Peer Connection...');
      const pc = createPeerConnection();

      pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
      };

      addAudioTrack(pc, stream);

      setStatus('Creating Offer...');
      const offer = await createOffer(pc);

      setStatus('Exchanging SDP...');
      const model = process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-realtime-preview-2024-12-17';
      const answer = await exchangeSDP(offer, session.client_secret, model);

      setStatus('Setting Remote Answer...');
      await setRemoteAnswer(pc, answer);

      setStatus('Connected! Speak now.');
    } catch (err) {
      console.error(err);
      setStatus('Error: ' + err.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text>WebRTC Status: {status}</Text>
      <Button title="Connect WebRTC" onPress={startConnection} />
      {/* react-native-webrtc often plays audio automatically, but having an RTCView attached to the stream ensures it's processed */}
      {remoteStream && <RTCView streamURL={remoteStream.toURL()} style={{ width: 0, height: 0 }} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
});
