import { useState, useRef, useEffect, useCallback } from 'react';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import * as Speech from 'expo-speech';
import NetInfo from '@react-native-community/netinfo';

import { playPCM16Base64, stopPlayback } from './audioPlayer';
import { routeEvent } from './eventRouter';
import { matchKeyword } from './voiceKeywords';
import { dispatchTool, TOOL_SCHEMAS } from './VoiceAgentTools';
import { SYSTEM_PROMPT } from '../constants/voicePrompt';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
const WS_URL = API_URL.replace(/^http/, 'ws') + '/voice/ws';

// WAV header is 44 bytes — we skip it to get raw PCM
const WAV_HEADER_SIZE = 44;

export function useVoiceSession(toolHandlers) {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState('');
  const [history, setHistory] = useState([]);
  const [amplitude, setAmplitude] = useState(0);

  const wsRef = useRef(null);
  const streamingRef = useRef(false);
  const recordingLoopRef = useRef(null);

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

    routeEvent(event, { setTranscript, setStatus, handleToolResult });
  }, []);

  /**
   * Record-chunk loop: records ~500ms of audio, reads the WAV file,
   * strips the header to get raw PCM16, sends as base64.
   * Repeats until streaming is stopped.
   */
  async function startAudioChunkLoop() {
    streamingRef.current = true;

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    });

    const recordingOptions = {
      isMeteringEnabled: true,
      android: {
        extension: '.wav',
        outputFormat: 0,    // DEFAULT
        audioEncoder: 0,    // DEFAULT  
        sampleRate: 24000,
        numberOfChannels: 1,
        bitRate: 384000,    // 24000 * 16 = 384kbps for PCM
      },
      ios: {
        extension: '.wav',
        audioQuality: 127,
        sampleRate: 24000,
        numberOfChannels: 1,
        bitRate: 384000,
        linearPCMBitDepth: 16,
        linearPCMIsBigEndian: false,
        linearPCMIsFloat: false,
      },
    };

    const loop = async () => {
      while (streamingRef.current) {
        try {
          const recording = new Audio.Recording();
          await recording.prepareToRecordAsync(recordingOptions);
          await recording.startAsync();
          recordingLoopRef.current = recording;

          // Record for ~500ms
          await new Promise(resolve => setTimeout(resolve, 500));

          if (!streamingRef.current) {
            try { await recording.stopAndUnloadAsync(); } catch(e) {}
            break;
          }

          // Get metering for amplitude
          const recStatus = await recording.getStatusAsync();
          if (recStatus.metering !== undefined) {
            const minDb = -60;
            const db = Math.max(recStatus.metering, minDb);
            setAmplitude(Math.pow(10, db / 20));
          }

          await recording.stopAndUnloadAsync();
          const uri = recording.getURI();

          if (uri && wsRef.current?.readyState === WebSocket.OPEN) {
            // Read the WAV file as base64
            const base64Wav = await FileSystem.readAsStringAsync(uri, {
              encoding: FileSystem.EncodingType.Base64,
            });

            // The WAV file has a 44-byte header. We need to strip it
            // to get raw PCM16 data. 44 bytes = 60 base64 chars (ceil(44*4/3))
            // Actually: base64 encodes 3 bytes to 4 chars.
            // 44 bytes -> ceil(44/3)*4 = 60 chars, but with padding it's aligned to 4
            // More precisely: 44 bytes = 14*3 + 2 remainder = 14*4 + 4(with padding) = 60 chars
            const headerBase64Len = Math.ceil(WAV_HEADER_SIZE / 3) * 4; // = 60
            const pcmBase64 = base64Wav.substring(headerBase64Len);

            if (pcmBase64.length > 0) {
              sendWsEvent({
                type: 'input_audio_buffer.append',
                audio: pcmBase64,
              });
            }

            // Clean up temp file
            try { await FileSystem.deleteAsync(uri, { idempotent: true }); } catch(e) {}
          }
        } catch (err) {
          if (streamingRef.current) {
            console.error('[AudioLoop] Error:', err);
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      setAmplitude(0);
    };

    loop();
  }

  function stopAudioChunkLoop() {
    streamingRef.current = false;
    if (recordingLoopRef.current) {
      try { recordingLoopRef.current.stopAndUnloadAsync(); } catch(e) {}
      recordingLoopRef.current = null;
    }
    setAmplitude(0);
  }

  async function startSession(offlineTextFallback = null) {
    if (status === 'offline') {
      if (offlineTextFallback) {
        setTranscript(offlineTextFallback);
        const match = matchKeyword(offlineTextFallback);
        if (match) {
          try {
            const result = await dispatchTool(match.tool, match.args);
            speak(result);
          } catch (err) {
            speak("माफ़ करें, कोई समस्या आई।");
          }
        } else {
          speak("मुझे समझ नहीं आया, कृपया फिर से बोलें।");
        }
      } else {
        speak("ऑफ़लाइन होने के कारण, कृपया अपना आदेश लिखें।");
      }
      return;
    }

    try {
      setStatus('connecting');
      setTranscript('');

      // Request audio permissions
      const { status: permStatus } = await Audio.requestPermissionsAsync();
      if (permStatus !== 'granted') {
        console.error('Audio permission denied');
        setStatus('idle');
        return;
      }

      console.log('[WS] Connecting to', WS_URL);
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[WS] Connected to relay');
        const updateEvent = {
          type: 'session.update',
          session: {
            instructions: SYSTEM_PROMPT,
            tools: TOOL_SCHEMAS,
            tool_choice: 'auto',
            voice: 'alloy',
            input_audio_transcription: { model: 'whisper-1' },
            turn_detection: {
              type: 'server_vad',
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 800,
            },
          },
        };
        ws.send(JSON.stringify(updateEvent));
        setStatus('listening');
        startAudioChunkLoop();
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type !== 'response.audio.delta') {
            console.log('[WS] <<', data.type);
          }
          handleServerEvent(data);
        } catch (err) {
          console.error('[WS] parse error:', err);
        }
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err.message);
      };

      ws.onclose = (event) => {
        console.log(`[WS] Closed: ${event.code}`);
        stopAudioChunkLoop();
        setStatus('idle');
      };
    } catch (err) {
      console.error('Session start error:', err);
      setStatus('idle');
    }
  }

  async function stopSession() {
    stopAudioChunkLoop();
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    await stopPlayback();
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
