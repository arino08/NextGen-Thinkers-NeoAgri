# Architecture & Data Flow

## 1. The Voice Pipeline (Online/Offline Hybrid)
- **Input:** User presses screen (or uses wake word if feasible) -> `expo-audio` records -> Audio sent to Backend.
- **Online Processing:** Backend runs Whisper (STT) -> LLM translates intent -> Backend returns JSON intent + text response.
- **Offline Processing (Fallback):** App relies on simple on-device buttons triggering specific local routines (since offline STT in JS is incredibly hard for a 36hr hackathon, the UI gracefully degrades to big, simple touch targets while maintaining the visual flair).

## 2. Drone to App Pipeline
- **Drone (Python):** Flies, takes pictures, runs ONNX model, generates `leaf_capture` payload.
- **Backend (Node.js):** Receives payload, stores in DB.
- **App (JS):** - Periodically polls backend when NetInfo detects Wi-Fi.
  - Downloads payloads into `expo-sqlite`.
  - Notifies user via Voice: "Aapke khet mein 3 nayi beemariyan detect hui hain." (3 new diseases detected in your field).

## 3. On-Device Camera Pipeline (Live Mode)
- Uses `react-native-vision-camera` frame processors.
- Passes frames to `react-native-fast-tflite` (App Model).
- **Index mapping:** 0: Pest, 1: Healthy, 2: Frog Leaf Eye, 3: Brown Spot.
- Results trigger TTS instantly.