import { playPCM16Base64 } from './audioPlayer';
import { dispatchTool } from './VoiceAgentTools';

export async function routeEvent(event, context) {
  const { setTranscript, setStatus, handleToolResult } = context;

  switch (event.type) {
    case 'response.audio.delta':
      if (event.delta) {
        await playPCM16Base64(event.delta);
      }
      break;

    case 'response.audio_transcript.delta':
      if (event.delta) {
        setTranscript(prev => prev + event.delta);
      }
      break;

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

    case 'response.done':
      setStatus('idle');
      break;

    case 'error':
      console.error('OpenAI DataChannel Error:', event.error);
      setStatus('idle');
      break;

    default:
      // Ignore other events
      break;
  }
}
