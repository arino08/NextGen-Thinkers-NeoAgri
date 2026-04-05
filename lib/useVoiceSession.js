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
  const [status, setStatus] = useState('idle');           // idle | connecting | listening | processing | speaking
  const [transcript, setTranscript] = useState('');        // Current live transcript / status text
  const [agentTranscript, setAgentTranscript] = useState(''); // Agent's streaming response
  const [history, setHistory] = useState([]);              // { role: 'user'|'agent', text: '...' }
  const [amplitude, setAmplitude] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);

  const wsRef = useRef(null);
  const streamingRef = useRef(false);

  // Network monitoring
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
        item: {
          type: 'function_call_output',
          call_id: call_id,
          output: resultString
        }
      });
      sendWsEvent({ type: 'response.create' });
    };

    routeEvent(event, {
      setTranscript,
      setAgentTranscript,
      setStatus,
      handleToolResult,
      addToHistory,
    });
  }, [addToHistory]);

  // ─── Push-to-Talk: start recording ───
  function startRecording() {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;

    // Discard any audio in the buffer when starting
    sendWsEvent({ type: 'input_audio_buffer.clear' });

    // Stop any playing audio when user starts talking
    stopPlayback();
    clearAudioBuffer();

    streamingRef.current = true;
    setStatus('listening');
    setTranscript('🎙️ Listening...');

    LiveAudioStream.init({
      sampleRate: 24000,
      channels: 1,
      bitsPerSample: 16,
      audioSource: 6, // VOICE_RECOGNITION
      bufferSize: 4096,
    });

    // Avoid stacking duplicate listeners across multiple hold/release cycles.
    if (typeof LiveAudioStream.removeAllListeners === 'function') {
      LiveAudioStream.removeAllListeners('data');
    }

    LiveAudioStream.on('data', (base64PCM) => {
      if (!streamingRef.current) return;
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        sendWsEvent({
          type: 'input_audio_buffer.append',
          audio: base64PCM,
        });
      }
      setAmplitude(base64PCM.length > 100 ? 0.5 : 0.1);
    });

    LiveAudioStream.start();
    console.log('[Audio] Recording started');
  }

  // ─── Push-to-Talk: stop recording & trigger response ───
  function stopRecording() {
    streamingRef.current = false;
    try { LiveAudioStream.stop(); } catch (e) {}
    setAmplitude(0);
    setStatus('processing');
    setTranscript('🤔 Processing...');
    console.log('[Audio] Recording stopped, committing buffer');

    // Commit the audio buffer and request a response
    sendWsEvent({ type: 'input_audio_buffer.commit' });
    sendWsEvent({ type: 'response.create' });
  }

  // ─── Connect WebSocket session ───
  async function startSession(offlineTextFallback = null) {
    if (status === 'offline') {
      handleOffline(offlineTextFallback);
      return;
    }

    if (sessionActive || status === 'connecting') return;
    if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      setStatus('connecting');
      setTranscript('Connecting...');
      setHistory([]);

      // Warm up Railway backend
      console.log('[WS] Warming up backend...');
      try {
        await fetch(API_URL + '/voice/session', { method: 'POST' }).catch(() => {});
      } catch (e) {}

      console.log('[WS] Connecting to', WS_URL);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to relay');
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'session.created') {
            console.log('[WS] Session created, configuring...');
            // Configure session for manual push-to-talk
            const updateEvent = {
              type: 'session.update',
              session: {
                type: 'realtime',
                instructions: SYSTEM_PROMPT,
                tools: TOOL_SCHEMAS,
                tool_choice: 'auto',
                voice: 'alloy',
                input_audio_transcription: { model: 'whisper-1' },
                turn_detection: null,
              },
            };
            ws.send(JSON.stringify(updateEvent));
          } else if (data.type === 'session.updated') {
            console.log('[WS] Session configured! Ready for push-to-talk.');
            setSessionActive(true);
            setStatus('idle');
            setTranscript('Hold the mic to speak');
          } else {
            if (data.type !== 'response.output_audio.delta') {
              console.log('[WS] <<', data.type);
            }
          }
          handleServerEvent(data);
        } catch (err) {
          console.error('[WS] parse error:', err);
        }
      };

      ws.onerror = (e) => {
        // RN dev mode shows a redbox for console.error; warn instead and recover cleanly.
        console.warn('[WS] Error:', e?.type || 'unknown', e?.message || '');
        setSessionActive(false);
        setStatus('idle');
        setTranscript('Connection issue. Tap mic to retry.');
      };

      ws.onclose = (event) => {
        console.log('[WS] Closed:', event.code, event?.reason || '');
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
        setSessionActive(false);
        setStatus('idle');
        if (event.code !== 1000) {
          setTranscript('Connection lost. Tap mic to reconnect.');
        } else {
          setTranscript('');
        }
      };
    } catch (err) {
      console.error('Session start error:', err);
      setStatus('idle');
    }
  }

  // ─── Disconnect ───
  async function stopSession() {
    streamingRef.current = false;
    try { LiveAudioStream.stop(); } catch (e) {}
    const ws = wsRef.current;
    wsRef.current = null;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      ws.close();
    }
    await stopPlayback();
    setSessionActive(false);
    setStatus('idle');
    setTranscript('');
    setAmplitude(0);
  }

  // ─── Offline fallback ───
  function handleOffline(textInput) {
    if (textInput) {
      addToHistory('user', textInput);
      const match = matchKeyword(textInput);
      if (match) {
        dispatchTool(match.tool, match.args).then(result => {
          addToHistory('agent', result);
          speak(result);
        });
      } else {
        const msg = "मुझे समझ नहीं आया, कृपया फिर से बोलें।";
        addToHistory('agent', msg);
        speak(msg);
      }
    } else {
      speak("ऑफ़लाइन होने के कारण, कृपया अपना आदेश लिखें।");
    }
  }

  function speak(text) {
    Speech.speak(text, { language: 'hi-IN' });
  }

  return {
    status,
    transcript,
    agentTranscript,
    history,
    isListening: status === 'listening',
    sessionActive,
    amplitude,
    startSession,
    stopSession,
    startRecording,
    stopRecording,
    speak,
  };
}
