import { useState, useRef, useEffect, useCallback } from 'react';
import LiveAudioStream from 'react-native-live-audio-stream';
import * as Speech from 'expo-speech';
import NetInfo from '@react-native-community/netinfo';

import { stopPlayback, clearAudioBuffer } from './audioPlayer';
import { routeEvent } from './eventRouter';
import { matchKeyword } from './voiceKeywords';
import { dispatchTool, TOOL_SCHEMAS } from './VoiceAgentTools';
import { SYSTEM_PROMPT, getSystemPrompt } from '../constants/voicePrompt';

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
  const audioInitRef = useRef(false);
  const connectingRef = useRef(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected === false) setStatus('offline');
      else setStatus(prev => prev === 'offline' ? 'idle' : prev);
    });
    return () => unsubscribe();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamingRef.current = false;
      try { LiveAudioStream.stop(); } catch (e) {}
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) try { ws.close(); } catch (e) {}
    };
  }, []);

  function sendWsEvent(eventObj) {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(eventObj));
      } catch (e) {
        console.warn('[WS] Send failed:', e.message);
      }
    }
  }

  const addToHistory = useCallback((role, text) => {
    if (!text || text.trim().length === 0) return;
    setHistory(prev => {
      // Cap history at 50 entries to save memory
      const next = [...prev, { role, text: text.trim() }];
      return next.length > 50 ? next.slice(-50) : next;
    });
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

    // Only init once — re-initing causes native crashes
    if (!audioInitRef.current) {
      LiveAudioStream.init({
        sampleRate: 24000, channels: 1, bitsPerSample: 16,
        audioSource: 6, bufferSize: 4096,
      });
      audioInitRef.current = true;
    }

    // Always clear old listeners before adding new
    try {
      if (typeof LiveAudioStream.removeAllListeners === 'function') {
        LiveAudioStream.removeAllListeners('data');
      }
    } catch (e) {}

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
    // Don't remove listeners here — let startRecording handle it next time
    setAmplitude(0);
    setStatus('processing');
    console.log('[Audio] Recording stopped');
    sendWsEvent({ type: 'input_audio_buffer.commit' });
    sendWsEvent({ type: 'response.create' });
  }

  // ─── Connect ───
  async function startSession() {
    if (status === 'offline') return;
    if (connectingRef.current || sessionActive) return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) return;

    try {
      connectingRef.current = true;
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
            getSystemPrompt().then(prompt => {
              ws.send(JSON.stringify({
                type: 'session.update',
                session: {
                  type: 'realtime',
                  instructions: prompt,
                  tools: TOOL_SCHEMAS,
                  tool_choice: 'auto',
                },
              }));
            }).catch(() => {
              ws.send(JSON.stringify({
                type: 'session.update',
                session: {
                  type: 'realtime',
                  instructions: SYSTEM_PROMPT,
                  tools: TOOL_SCHEMAS,
                  tool_choice: 'auto',
                },
              }));
            });
          } else if (data.type === 'session.updated') {
            console.log('[WS] Session configured! Ready.');
            setSessionActive(true);
            setStatus('idle');
            connectingRef.current = false;
          } else if (data.type === 'error') {
            console.warn('[WS] OpenAI error:', JSON.stringify(data.error));
          } else if (data.type !== 'response.output_audio.delta' && data.type !== 'response.audio.delta') {
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
        connectingRef.current = false;
      };

      ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code);
        if (wsRef.current === ws) wsRef.current = null;
        setSessionActive(false);
        setStatus('idle');
        connectingRef.current = false;
      };
    } catch (err) {
      console.error('Session start error:', err);
      setStatus('idle');
      connectingRef.current = false;
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
    connectingRef.current = false;
  }

  function speak(text) { Speech.speak(text, { language: 'hi-IN' }); }

  return {
    status, transcript, agentTranscript, history,
    isListening: status === 'listening', sessionActive, amplitude,
    startSession, stopSession, startRecording, stopRecording, speak,
  };
}
