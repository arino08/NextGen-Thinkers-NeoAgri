import { bufferPCM16Chunk, flushAudioBuffer, clearAudioBuffer, stopPlayback } from './audioPlayer';
import { dispatchTool } from './VoiceAgentTools';

export async function routeEvent(event, context) {
  const { setTranscript, setAgentTranscript, setStatus, handleToolResult, addToHistory } = context;

  switch (event.type) {
    // --- Audio chunks: buffer them, don't play individually ---
    case 'response.output_audio.delta':
    case 'response.audio.delta':
      if (event.delta) {
        bufferPCM16Chunk(event.delta);
      }
      break;

    // --- Audio done: flush the buffer and play the full response ---
    case 'response.output_audio.done':
    case 'response.audio.done':
      await flushAudioBuffer();
      break;

    // --- Agent transcript streaming ---
    case 'response.output_audio_transcript.delta':
    case 'response.audio_transcript.delta':
      if (event.delta) {
        setAgentTranscript(prev => prev + event.delta);
      }
      break;

    // --- Agent transcript complete: commit to history ---
    case 'response.output_audio_transcript.done':
    case 'response.audio_transcript.done':
      if (event.transcript) {
        addToHistory('agent', event.transcript);
        setAgentTranscript('');
      }
      break;

    // --- User audio transcript (from OpenAI's input transcription) ---
    case 'conversation.item.input_audio_transcription.completed':
      if (event.transcript) {
        addToHistory('user', event.transcript);
      }
      break;

    // --- Tool calls ---
    case 'response.function_call_arguments.done':
      try {
        const args = JSON.parse(event.arguments || '{}');
        const resultString = await dispatchTool(event.name, args);
        if (handleToolResult) {
          handleToolResult(event.call_id, resultString);
        }
      } catch (err) {
        console.error('Error executing tool call:', err);
      }
      break;

    // --- Response lifecycle ---
    case 'response.created':
      setStatus('speaking');
      break;

    case 'response.done':
      setStatus('idle');
      break;

    // --- VAD events (if server VAD is used) ---
    case 'input_audio_buffer.speech_started':
      clearAudioBuffer();
      await stopPlayback();
      setTranscript('🎙️ Listening...');
      break;

    case 'input_audio_buffer.speech_stopped':
      setStatus('processing');
      setTranscript('🤔 Processing...');
      break;

    case 'error':
      console.error('OpenAI Error:', event.error);
      setStatus('idle');
      break;

    default:
      break;
  }
}
