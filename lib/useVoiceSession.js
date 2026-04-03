import { useState, useRef, useEffect } from 'react';
import { mediaDevices } from 'react-native-webrtc';
import * as Speech from 'expo-speech';
import NetInfo from '@react-native-community/netinfo';

import { fetchSessionToken } from './realtimeSession';
import { createPeerConnection, addAudioTrack, createOffer, setRemoteAnswer } from './peerConnection';
import { exchangeSDP } from './openaiHandshake';
import { createDataChannel, onServerEvent, sendToolResult } from './dataChannel';
import { sendSessionUpdate } from './sessionConfig';
import { startRecording, stopRecording, getAmplitude } from './audioRecorder';
import { stopPlayback } from './audioPlayer';
import { routeEvent } from './eventRouter';

import { TOOL_SCHEMAS } from './VoiceAgentTools';
import { SYSTEM_PROMPT } from '../constants/voicePrompt';

export function useVoiceSession(toolHandlers) {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [history, setHistory] = useState([]);
  const [amplitude, setAmplitude] = useState(0);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const recordingRef = useRef(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected === false) {
        setStatus('offline');
      } else {
        setStatus(prev => prev === 'offline' ? 'idle' : prev);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    let interval;
    if (status === 'listening' && recordingRef.current) {
      interval = setInterval(async () => {
        const amp = await getAmplitude(recordingRef.current);
        setAmplitude(amp);
      }, 100);
    }
    return () => clearInterval(interval);
  }, [status]);

  async function startSession() {
    try {
      setStatus('connecting');
      setTranscript('');

      const session = await fetchSessionToken();
      const stream = await mediaDevices.getUserMedia({ audio: true });
      
      const { recording } = await startRecording();
      recordingRef.current = recording;

      const pc = createPeerConnection();
      pcRef.current = pc;

      addAudioTrack(pc, stream);

      const dc = createDataChannel(pc);
      dcRef.current = dc;

      const handleToolResult = (call_id, resultString) => {
        sendToolResult(dc, call_id, resultString);
      };

      onServerEvent(dc, (event) => {
        routeEvent(event, { setTranscript, setStatus, handleToolResult });
      });

      dc.onopen = () => {
        sendSessionUpdate(dc, TOOL_SCHEMAS, SYSTEM_PROMPT);
      };

      const offer = await createOffer(pc);
      const model = process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-realtime-preview-2024-12-17';
      const answer = await exchangeSDP(offer, session.client_secret, model);
      
      await setRemoteAnswer(pc, answer);

      setStatus('listening');
    } catch (err) {
      console.error('Session start error:', err);
      setStatus('idle');
    }
  }

  async function stopSession() {
    if (recordingRef.current) {
      await stopRecording(recordingRef.current);
      recordingRef.current = null;
    }
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    await stopPlayback();
    setAmplitude(0);
    setStatus('idle');
  }

  function speak(text) {
    Speech.speak(text, { language: 'hi-IN' });
  }

  return {
    status,
    transcript,
    history,
    isListening: status === 'listening',
    amplitude,
    startSession,
    stopSession,
    speak,
  };
}
