import { useState, useRef, useEffect, useCallback } from 'react';
import LiveAudioStream from 'react-native-live-audio-stream';
import * as Speech from 'expo-speech';
import NetInfo from '@react-native-community/netinfo';

import { stopPlayback, clearAudioBuffer } from './audioPlayer';
import { routeEvent } from './eventRouter';
import { matchKeyword } from './voiceKeywords';
import { dispatchTool, TOOL_SCHEMAS } from './VoiceAgentTools';
import { SYSTEM_PROMPT } from '../constants/voicePrompt';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/voice/ws';

export function useVoiceSession(toolHandlers) {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [agentTranscript, setAgentTranscript] = useState('');
  const [history, setHistory] = useState([]);
  const [amplitude, setAmplitude] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);

  const wsRef = useRef(null);
  const streamingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected === false) setStatus('offline');
      else setStatus(prev => prev === 'offline' ? 'idle' : prev);
    });
    return () => unsubscribe();
  }, []);

  function sendWsEvent(eventObj) {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(eventObj));
    }
  }

  const addToHistory = useCallback((role, text) => {
    if (!text || text.trim().length === 0) return;
    setHistory(prev => [...prev, { role, text: text.trim() }]);
  }, []);

  const handleServerEvent = useCallback((event) => {
    const handleToolResult = (call_id, resultString) => {
      sendWsEvent({
        type: 'conversation.item.create',
        item: { type: 'function_call_output', call_id, output: resultString }
      });
      sendWsEvent({ type: 'response.create' });
    };
    routeEvent(event, { setTranscript, setAgentTranscript, setStatus, handleToolResult, addToHistory });
  }, [addToHistory]);

  // ─── Push-to-Talk ───
  function startRecording() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    sendWsEvent({ type: 'input_audio_buffer.clear' });
    stopPlayback();
    clearAudioBuffer();
    streamingRef.current = true;
    setStatus('listening');

    LiveAudioStream.init({
      sampleRate: 24000, channels: 1, bitsPerSample: 16,
      audioSource: 6, bufferSize: 4096,
    });
    if (typeof LiveAudioStream.removeAllListeners === 'function') {
      LiveAudioStream.removeAllListeners('data');
    }
    LiveAudioStream.on('data', (base64PCM) => {
      if (!streamingRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendWsEvent({ type: 'input_audio_buffer.append', audio: base64PCM });
      }
      setAmplitude(base64PCM.length > 100 ? 0.6 : 0.15);
    });
    LiveAudioStream.start();
    console.log('[Audio] Recording started');
  }

  function stopRecording() {
    streamingRef.current = false;
    try { LiveAudioStream.stop(); } catch (e) {}
    setAmplitude(0);
    setStatus('processing');
    console.log('[Audio] Recording stopped');
    sendWsEvent({ type: 'input_audio_buffer.commit' });
    sendWsEvent({ type: 'response.create' });
  }

  // ─── Connect ───
  async function startSession() {
    if (status === 'offline') return;
    if (sessionActive || status === 'connecting') return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

    try {
      setStatus('connecting');

      // Warm up Railway
      console.log('[WS] Warming up backend...');
      try { await fetch(API_URL + '/voice/session', { method: 'POST' }).catch(() => {}); } catch (e) {}

      console.log('[WS] Connecting to', WS_URL);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => console.log('[WS] Connected to relay');

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'session.created') {
            console.log('[WS] Session created, configuring...');
            // ─── CORRECT GA API PARAMS ───
            // Only send params the GA API accepts.
            // voice, input_audio_transcription, modalities are NOT valid.
            // turn_detection is inside audio.input in GA, but we omit it
            // to get the default server_vad disabled (manual push-to-talk).
            ws.send(JSON.stringify({
              type: 'session.update',
              session: {
                type: 'realtime',
                instructions: SYSTEM_PROMPT,
                tools: TOOL_SCHEMAS,
                tool_choice: 'auto',
              },
            }));
          } else if (data.type === 'session.updated') {
            console.log('[WS] Session configured! Ready.');
            setSessionActive(true);
            setStatus('idle');
          } else if (data.type === 'error') {
            // Log but don't crash
            console.warn('[WS] OpenAI error:', JSON.stringify(data.error));
          } else if (data.type !== 'response.output_audio.delta') {
            console.log('[WS] <<', data.type);
          }
          handleServerEvent(data);
        } catch (err) {
          console.error('[WS] parse error:', err);
        }
      };

      ws.onerror = (e) => {
        console.warn('[WS] Error:', e?.type || 'unknown');
        setSessionActive(false);
        setStatus('idle');
      };

      ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code);
        if (wsRef.current === ws) wsRef.current = null;
        setSessionActive(false);
        setStatus('idle');
      };
    } catch (err) {
      console.error('Session start error:', err);
      setStatus('idle');
    }
  }

  async function stopSession() {
    streamingRef.current = false;
    try { LiveAudioStream.stop(); } catch (e) {}
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) ws.close();
    await stopPlayback();
    setSessionActive(false);
    setStatus('idle');
    setAmplitude(0);
  }

  function speak(text) { Speech.speak(text, { language: 'hi-IN' }); }

  return {
    status, transcript, agentTranscript, history,
    isListening: status === 'listening', sessionActive, amplitude,
    startSession, stopSession, startRecording, stopRecording, speak,
  };
}
