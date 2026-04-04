import { sendEvent } from './dataChannel';

export function sendSessionUpdate(dc, toolSchemas, systemPrompt) {
  const updateEvent = {
    type: 'session.update',
    session: {
      instructions: systemPrompt,
      tools: toolSchemas,
      tool_choice: 'auto',
      voice: 'alloy',
      input_audio_format: 'pcm16',
      output_audio_format: 'pcm16',
      input_audio_transcription: { model: 'whisper-1' },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 800,
      },
    },
  };
  
  sendEvent(dc, updateEvent);
}
