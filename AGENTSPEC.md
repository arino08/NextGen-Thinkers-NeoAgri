# NeoAgri Voice — Multi-Agent Spec Sheet
**Hackathon:** ABV IIITM Hacksagon | **Duration:** 36 Hours | **Model:** Gemini 3.1 Pro (fallback: Claude Opus 4.6)

---

## MASTER SPEC — Read Before Every Task (All Agents)

### Project Mission
Convert NeoAgri (drone-assisted crop disease detection app) into a **voice-first, fully offline-capable agentic app** for Indian farmers. The farmer must be able to complete every core action — finding drone markers, navigating to GPS pins, running live scans, and getting disease cures — **entirely through spoken Hindi commands, zero touch required.**

---

### Absolute Rules (Violations = Blocked PR)

| # | Rule | Reason |
|---|------|---------|
| 1 | **Never use TypeScript** — `.js` only | Project-wide contract |
| 2 | **Never import from `@tensorflow/*`** | App model uses `react-native-fast-tflite` only |
| 3 | **Never merge drone model and app model logic** | Drone model is Python/ONNX on server, app model is TFLite on-device |
| 4 | **Offline always works** — every feature degrades gracefully | Field conditions have no internet |
| 5 | **All farmer-facing text must support Hindi** — `expo-speech` with `language: 'hi-IN'` | Primary user is Hindi-speaking farmer |
| 6 | **Frame processor worklets must stay in worklets** — no async in VisionCamera worklet context | RN-VisionCamera v4 requirement |
| 7 | **Never use `AsyncStorage` for structured data** — use `expo-sqlite` | Offline DB contract |
| 8 | **Never hardcode OpenAI API key in the app** — always fetch ephemeral token from `/voice/session` | Security |
| 9 | **After any task, update `agent_docs/progress.md`** | Shared awareness between agents |
| 10 | **Never add a new npm dependency without checking if existing SDK covers it** | Expo SDK 54 is large; duplicates bloat build |

---

### Tech Stack Reference

| Layer | Package | Version | Notes |
|---|---|---|---|
| Framework | `expo` | SDK 54 | Run `npx expo run:android` after native changes |
| React Native | `react-native` | 0.81.5 | JS only, no TypeScript |
| Navigation | `expo-router` | v4 | File-based routing in `app/` |
| Camera | `react-native-vision-camera` | v4 | Frame processors must use worklets |
| ML Inference | `react-native-fast-tflite` | latest | Model at `models/neoagri_app_model.tflite` |
| Resize plugin | `vision-camera-resize-plugin` | latest | Required before TFLite input |
| Offline DB | `expo-sqlite` | latest | All structured data goes here |
| Location | `expo-location` | latest | GPS for radar + navigation |
| TTS (offline) | `expo-speech` | latest | Hindi via `language: 'hi-IN'` |
| Audio I/O | `expo-av` | latest | PCM16 recording + playback |
| WebRTC | `react-native-webrtc` | latest | Realtime API peer connection |
| Network | `@react-native-community/netinfo` | latest | Online/offline detection |
| Backend | Node.js + Express + Postgres | — | `neo-backend` repo |

---

### Existing Assets — Do Not Modify or Recreate

| Asset | Path | Status |
|---|---|---|
| App TFLite model | `models/neoagri_app_model.tflite` | ✅ Done |
| Disease labels + cures | `models/disease_labels.json` | ✅ Done |
| Offline sync engine | `app/db/offlineSync.js` | ✅ Done |
| SQLite schema + queries | `app/db/` | ✅ Done |
| Frame processor (inference) | `app/components/LiveModeCamera.js` | ✅ Done |
| GPS radar screen | `app/radar.jsx` | ✅ Done |
| Drone backend | `website_station_backend/` | ✅ Done |
| Node backend (base routes) | `neo-backend/` | ✅ Done, 2 new routes only |

---

### Model Output Reference (Agent 2 must know this)

```
TFLite output: float32[4] — index order is critical:
  [0] → Caterpillar and Semilooper Pest Attack  (severity: High)
  [1] → Healthy_Soyabean                         (severity: None)
  [2] → Soyabean_Frog_Leaf_Eye                   (severity: Medium)
  [3] → Soyabean_Spectoria_Brown_Spot             (severity: Medium)

Confidence: argMax of output array
Labels + cure strings: models/disease_labels.json (keyed by disease name)
```

---

### Inter-Agent Interfaces (Contracts)

These are the exact function signatures each agent must export. Any change to a signature requires ALL dependent agents to be notified immediately.

```js
// ── Agent 1 exports (lib/useVoiceSession.js) ──────────────────────────
export function useVoiceSession(toolHandlers)
// Returns: { status, transcript, isListening, startSession, stopSession, speak }
// status: 'idle' | 'connecting' | 'listening' | 'speaking' | 'offline'
// toolHandlers: object mapping toolName → async function(args) → result string

// ── Agent 2 exports (lib/VoiceAgentTools.js) ─────────────────────────
export const TOOL_SCHEMAS     // Array of OpenAI function_call tool schema objects
export const TOOL_HANDLERS    // Object: { toolName: async (args) => string }
export const SYSTEM_PROMPT    // String: OpenAI system prompt with Hindi instruction
export async function dispatchTool(toolName, args)  // Routes call to correct handler

// ── Agent 3 exports (components/voice/) ──────────────────────────────
export default VoiceOrb        // components/voice/VoiceOrb.js — animated mic button
export default TranscriptFeed  // components/voice/TranscriptFeed.js — scrolling transcript
export default DiseaseCard     // components/voice/DiseaseCard.js — disease result display
export default StatusBanner    // components/voice/StatusBanner.js — connection state

// ── Agent 4 exports (neo-backend new routes) ─────────────────────────
POST /voice/session  → { client_secret: string, session_id: string, expires_at: number }
POST /voice/log      → { ok: true }
```

---

### Git Worktree Strategy (Run These Commands Before Starting)

```bash
# Each agent runs these in the neoagri-mobile root:
git worktree add ../neoagri-voice-pipeline  voice/pipeline   # Agent 1
git worktree add ../neoagri-voice-tools     voice/tools      # Agent 2
git worktree add ../neoagri-voice-ui        voice/ui         # Agent 3
git worktree add ../neoagri-voice-backend   voice/backend    # Agent 4

# Merge order at end: tools → pipeline → ui → backend → main
```

---

### Environment Variables

```env
# .env (neoagri-mobile)
EXPO_PUBLIC_API_URL=https://your-neo-backend.railway.app
EXPO_PUBLIC_OPENAI_MODEL=gpt-4o-realtime-preview-2025-12-17

# .env (neo-backend)
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
PORT=3001
```

---
---

## AGENT 1 — Voice Pipeline
**Branch:** `voice/pipeline` | **Owner:** Agent 1
**Dependency:** Needs Agent 4's `/voice/session` endpoint before full testing. Use mock token locally.
**Timeline:** Hours 0–10 (core), Hours 20–24 (offline fallback polish)

### Mission
Build the complete audio pipeline that connects the farmer's voice to the OpenAI Realtime API and routes tool calls to Agent 2's handlers. This is the **central nervous system** of the entire voice app. When online, use WebRTC. When offline, use keyword matching + `expo-speech`.

---

### File Deliverables

#### `lib/useVoiceSession.js` (Primary Deliverable)

This is a React hook. It must:

1. **Fetch ephemeral token** from `{EXPO_PUBLIC_API_URL}/voice/session` on session start
2. **Establish WebRTC peer connection** using `react-native-webrtc`
3. **Create data channel** named `"oai-events"` for sending/receiving JSON events
4. **Capture microphone** via `expo-av` `Audio.Recording` in PCM16 format, 24kHz
5. **Stream audio** through the peer connection's audio track
6. **Receive AI audio** response and play via `expo-av` `Audio.Sound`
7. **Intercept `response.function_call` events** on the data channel and call `dispatchTool()` from Agent 2
8. **Send `tool_result`** back on the data channel after each tool call resolves
9. **Track transcript** from `response.audio_transcript.delta` events
10. **On offline** (NetInfo.isConnected === false): switch to keyword mode (see `lib/voiceKeywords.js`)

**Exact hook signature:**
```js
export function useVoiceSession(toolHandlers) {
  // toolHandlers = TOOL_HANDLERS from Agent 2's VoiceAgentTools.js
  return {
    status,         // 'idle'|'connecting'|'listening'|'speaking'|'offline'
    transcript,     // string — current turn transcript
    isListening,    // boolean
    startSession,   // async () => void
    stopSession,    // () => void
    speak,          // (text: string) => void  — for programmatic TTS
  }
}
```

**WebRTC connection sequence (must follow exactly):**
```
1. fetch POST /voice/session  → { client_secret }
2. new RTCPeerConnection()
3. pc.addTransceiver('audio', { direction: 'sendrecv' })
4. const dc = pc.createDataChannel('oai-events')
5. dc.onmessage = handleServerEvent
6. const offer = await pc.createOffer()
7. await pc.setLocalDescription(offer)
8. POST https://api.openai.com/v1/realtime?model={model}
   Headers: Authorization: Bearer {client_secret}, Content-Type: application/sdp
   Body: offer.sdp
9. const answer = { type: 'answer', sdp: responseText }
10. await pc.setRemoteDescription(answer)
11. Send session.update event with tool schemas and system prompt
```

**Session update event format (send immediately after connection):**
```js
dc.send(JSON.stringify({
  type: 'session.update',
  session: {
    instructions: SYSTEM_PROMPT,         // from Agent 2
    tools: TOOL_SCHEMAS,                 // from Agent 2
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
  }
}))
```

**Function call handling (data channel):**
```js
if (event.type === 'response.function_call_arguments.done') {
  const { name, arguments: argsStr, call_id } = event
  const result = await dispatchTool(name, JSON.parse(argsStr))
  dc.send(JSON.stringify({
    type: 'conversation.item.create',
    item: {
      type: 'function_call_output',
      call_id,
      output: result,   // must be a string
    }
  }))
  dc.send(JSON.stringify({ type: 'response.create' }))
}
```

---

#### `lib/voiceKeywords.js` (Offline Fallback)

Simple keyword → action mapper. Used when `status === 'offline'`.

```js
// Keyword patterns (Hindi + transliterated) → tool name mapping
const KEYWORD_MAP = [
  { patterns: ['स्कैन', 'scan', 'camera', 'कैमरा'],         tool: 'start_live_mode',     args: {} },
  { patterns: ['नक्शा', 'marker', 'markers', 'खेत'],        tool: 'scan_nearby_markers', args: {} },
  { patterns: ['जाओ', 'navigate', 'GPS', 'नेविगेट'],        tool: 'navigate_to_pin',     args: {} },
  { patterns: ['बीमारी', 'disease', 'बताओ', 'kya hai'],     tool: 'get_disease_info',    args: {} },
  { patterns: ['sync', 'भेजो', 'upload', 'internet'],       tool: 'sync_pending_scans',  args: {} },
  { patterns: ['status', 'कितना', 'report', 'हाल'],         tool: 'report_status',       args: {} },
]

export function matchKeyword(spokenText)
// Returns: { tool, args } | null
```

**Speech recognition offline:** Use `expo-speech` recognition if available, otherwise show visual keyboard fallback. Primary audio input is `expo-av`.

---

#### `lib/audioPlayer.js`

Utility to decode and play PCM16 audio chunks from the Realtime API.

```js
export async function playPCM16Chunk(base64PCM16, sampleRate = 24000)
export function stopPlayback()
export function setPlaybackVolume(0.0 - 1.0)
```

Use `expo-av` `Audio.Sound` with `{shouldPlay: true}` for streaming chunks.

---

### Acceptance Criteria

- [ ] Can start session, speak "hello", receive AI audio response within 3 seconds
- [ ] Tool call flow: ask "नज़दीक के marker दिखाओ" → `scan_nearby_markers` is called → AI speaks result
- [ ] Offline mode: internet off → `status === 'offline'` → keyword "स्कैन" → `start_live_mode` triggered → `expo-speech` speaks Hindi confirmation
- [ ] Session cleanup: `stopSession()` closes peer connection, stops audio recording, clears transcript
- [ ] No audio echo/loop (server VAD + proper audio session config prevents this)

---

### Known Pitfalls

- `react-native-webrtc` requires `AndroidManifest.xml` permissions: `RECORD_AUDIO`, `INTERNET`, `CAMERA`. Check `agent_docs/native_setup.md` first.
- `expo-av` audio session must be set to `INTERRUPTION_MODE_ANDROID_DO_NOT_MIX` to prevent echo with the AI's audio output.
- PCM16 base64 chunks from OpenAI come as `response.audio.delta` events — they must be buffered and decoded before playback.
- The `react-native-webrtc` `MediaStream` getUserMedia polyfill needs `mediaDevices` registration — verify it's in the app entry point.

---
---

## AGENT 2 — Tool Integration Layer
**Branch:** `voice/tools` | **Owner:** Agent 2
**Dependency:** Needs existing `app/db/offlineSync.js` exports and `models/disease_labels.json`. Both exist.
**Timeline:** Hours 3–12 (schemas + handlers), Hours 16–18 (refinement after Agent 1 integration)

### Mission
Build the **tool layer** — the bridge between what the AI hears and what the app does. Every existing NeoAgri feature (markers, scanning, navigation, sync) gets wrapped as an OpenAI function-calling tool with a proper JSON schema and Hindi-friendly output strings. No new business logic — only wrappers and orchestration.

---

### File Deliverables

#### `lib/VoiceAgentTools.js` (Primary Deliverable)

**Tool 1: `scan_nearby_markers`**
```js
schema: {
  name: 'scan_nearby_markers',
  description: 'Fetches all drone-detected disease markers near the farmer. Returns GPS pins from cached offline data.',
  parameters: {
    type: 'object',
    properties: {
      radius_km: { type: 'number', description: 'Search radius in kilometers. Default 5.' }
    },
    required: []
  }
}

handler: async ({ radius_km = 5 }) => {
  const markers = await getOfflineMarkers()   // existing function from app/db/offlineSync.js
  if (!markers.length) return 'आपके खेत में अभी कोई बीमारी नहीं मिली है।'
  const summary = markers.map(m =>
    `${m.disease} (${m.confidence}%) — ${m.distance_km.toFixed(1)} km दूर`
  ).join(', ')
  return `${markers.length} संक्रमित स्थान मिले: ${summary}`
}
```

**Tool 2: `start_live_mode`**
```js
schema: {
  name: 'start_live_mode',
  description: 'Activates the phone camera with real-time TFLite disease detection at 5 FPS.',
  parameters: { type: 'object', properties: {}, required: [] }
}

handler: async () => {
  // Emit a navigation event that Agent 3's UI listens to
  voiceEventEmitter.emit('NAVIGATE', { screen: 'live-mode' })
  return 'कैमरा चालू हो गया। पत्ते के पास फ़ोन लाएं।'
}
```

**Tool 3: `navigate_to_pin`**
```js
schema: {
  name: 'navigate_to_pin',
  description: 'Opens GPS radar and guides farmer to a specific disease marker.',
  parameters: {
    type: 'object',
    properties: {
      marker_id: { type: 'string', description: 'The capture_id of the drone marker to navigate to.' },
      index: { type: 'number', description: 'If no marker_id, use index (1-based) from last scan_nearby_markers result.' }
    },
    required: []
  }
}

handler: async ({ marker_id, index }) => {
  const markers = await getOfflineMarkers()
  const target = marker_id
    ? markers.find(m => m.capture_id === marker_id)
    : markers[Math.max(0, (index || 1) - 1)]
  if (!target) return 'मार्कर नहीं मिला।'
  voiceEventEmitter.emit('NAVIGATE', { screen: 'radar', params: { markerId: target.capture_id } })
  return `ठीक है, नेविगेशन शुरू हो गया। ${target.distance_km.toFixed(1)} किलोमीटर दूर है।`
}
```

**Tool 4: `get_disease_info`**
```js
schema: {
  name: 'get_disease_info',
  description: 'Returns disease name, severity, and recommended treatment for a crop disease.',
  parameters: {
    type: 'object',
    properties: {
      disease_name: { type: 'string', description: 'Name of the disease from scan result.' }
    },
    required: ['disease_name']
  }
}

handler: async ({ disease_name }) => {
  const labels = require('../models/disease_labels.json')
  const entry = Object.values(labels).find(l =>
    l.name.toLowerCase().includes(disease_name.toLowerCase())
  )
  if (!entry) return `${disease_name} की जानकारी नहीं मिली।`
  return `${entry.name_hi}: गंभीरता ${entry.severity_hi}। उपाय: ${entry.cure_hi}`
}
```

**Tool 5: `sync_pending_scans`**
```js
schema: {
  name: 'sync_pending_scans',
  description: 'Uploads pending offline scan results to the server when internet is available.',
  parameters: { type: 'object', properties: {}, required: [] }
}

handler: async () => {
  const { syncPendingScans } = require('../app/db/offlineSync')
  const result = await syncPendingScans()
  if (result.synced === 0) return 'कोई pending स्कैन नहीं था।'
  return `${result.synced} स्कैन सफलतापूर्वक अपलोड हो गए।`
}
```

**Tool 6: `report_status`**
```js
schema: {
  name: 'report_status',
  description: 'Reports current app status — how many markers are cached, how many scans are pending sync.',
  parameters: { type: 'object', properties: {}, required: [] }
}

handler: async () => {
  const { getOfflineMarkers, getPendingScans } = require('../app/db/offlineSync')
  const [markers, pending] = await Promise.all([getOfflineMarkers(), getPendingScans()])
  return `${markers.length} मार्कर cached हैं। ${pending.length} स्कैन sync के लिए pending हैं।`
}
```

---

#### `constants/voicePrompt.js`

```js
export const SYSTEM_PROMPT = `
You are NeoAgri, an AI farming assistant for Indian soybean farmers.

LANGUAGE RULES:
- Always respond in simple, spoken Hindi (Devanagari script preferred, but Roman Hindi is acceptable).
- Keep responses under 2 sentences — farmers need quick, actionable information.
- Never use technical jargon. Say "पत्ते की बीमारी" not "leaf pathology".

BEHAVIOR:
- You have access to tools to check drone scan results, navigate to GPS pins, start the camera, get disease info, and sync data.
- When a farmer mentions a field, disease, camera, or navigation, use the appropriate tool immediately.
- After every tool call result, confirm the action in Hindi and ask what to do next.
- If internet is unavailable, acknowledge it and use whatever offline tools are available.

PERSONALITY:
- Helpful, calm, and direct. Think village extension officer, not tech product.
- Never say you cannot help. If a tool fails, suggest the next best action.
`
```

---

#### `lib/voiceEventEmitter.js`

Simple event emitter for navigation triggers between Agent 2's tool handlers and Agent 3's UI.

```js
import { EventEmitter } from 'eventemitter3'
export const voiceEventEmitter = new EventEmitter()

// Events emitted:
// 'NAVIGATE' → { screen: 'live-mode' | 'radar' | 'home', params?: {} }
// 'DISEASE_RESULT' → { disease, severity, cure, confidence }
// 'SCAN_COMPLETE' → { markerId, disease, timestamp }
```

---

#### `models/disease_labels.json` — Required Fields (verify these exist, add if missing)

Each disease entry must have: `name`, `name_hi`, `severity`, `severity_hi`, `cure`, `cure_hi`. If Hindi fields are missing, add them. This is Agent 2's responsibility to verify completeness.

---

### Acceptance Criteria

- [ ] All 6 `TOOL_SCHEMAS` are valid JSON Schema objects (test with `ajv` or manually)
- [ ] All 6 `TOOL_HANDLERS` return strings (not objects — OpenAI function output must be string)
- [ ] `dispatchTool('scan_nearby_markers', {})` returns a Hindi string with marker count
- [ ] `dispatchTool('get_disease_info', { disease_name: 'Frog Eye' })` returns Hindi cure text
- [ ] `voiceEventEmitter` emits `NAVIGATE` with correct payload when `start_live_mode` or `navigate_to_pin` is called
- [ ] All handler failures (DB error, missing data) return a Hindi fallback string — never throw

---

### Known Pitfalls

- `getOfflineMarkers()` returns raw SQLite rows. Check column names match what your handler expects (likely `capture_id`, `latitude`, `longitude`, `disease`, `confidence`). Add `distance_km` calculation using `expo-location`'s `getLastKnownPositionAsync` inside the handler.
- Tool output must be a **string**. Never return `JSON.stringify(object)` — the AI will read it as code. Format it as a natural language sentence.
- `disease_labels.json` key format matters — check whether it's keyed by disease name or index, and handle accordingly.

---
---

## AGENT 3 — Voice-First UI
**Branch:** `voice/ui` | **Owner:** Agent 3
**Dependency:** Needs Agent 1's `useVoiceSession` hook signature and `status` enum. Agent 2's `voiceEventEmitter` events.
**Timeline:** Hours 4–16 (all screens), Hours 24–28 (polish + demo-readiness)

### Mission
Design and build the **minimal, stunning voice-first interface**. The screen should communicate state (listening, speaking, thinking, offline) entirely through motion and visual language — a single mic orb is the entire UI. Also wire up Agent 2's navigation events to existing screens (LiveMode, Radar).

---

### File Deliverables

#### `app/index.jsx` (Replace or Modify — Main Entry Screen)

This becomes the voice home screen. It should:
- Mount `useVoiceSession` with `TOOL_HANDLERS`
- Subscribe to `voiceEventEmitter` `NAVIGATE` events
- Route to `app/live.jsx` or `app/radar.jsx` on NAVIGATE events
- Render the VoiceOrb, TranscriptFeed, StatusBanner, and DiseaseCard

```jsx
// Layout: full screen, dark background
// Top 10%: StatusBanner (connection state)
// Middle 50%: VoiceOrb (the centerpiece)
// Bottom 40%: TranscriptFeed + DiseaseCard (slides up when result exists)
```

---

#### `components/voice/VoiceOrb.js`

The core visual. Animated circle that reacts to voice state.

| State | Visual |
|---|---|
| `idle` | Static teal circle, faint pulse |
| `connecting` | Rotating arc/spinner around orb |
| `listening` | Orb expands and contracts with mic amplitude — use `expo-av` metering |
| `speaking` | Concentric ripples emanate outward (AI is speaking) |
| `offline` | Orb is grey with a wifi-slash icon inside |

```js
// Props:
// status: 'idle' | 'connecting' | 'listening' | 'speaking' | 'offline'
// amplitude: number (0.0–1.0, from expo-av metering, passed from Agent 1)
// onPress: () => void (start/stop session toggle)
// size: number (default 180)

// Implementation: React Native Animated API only — no Reanimated needed.
// Single <Animated.View> with Animated.loop for ripple effect.
// Use Animated.spring for orb scale on state transitions.
```

**Color palette for orb:**
```
idle/listening: #00C896 (teal — matches NeoAgri brand)
speaking: #4A90E2 (blue — AI is talking)
offline: #888888 (grey)
connecting: #FFA500 (amber — in progress)
```

---

#### `components/voice/TranscriptFeed.js`

Scrolling transcript of what was said and what the AI responded.

```js
// Props:
// transcript: string (current turn, streaming word by word)
// history: Array<{ role: 'user'|'assistant', text: string }> (previous turns)
// maxVisible: number (default 3 — show last 3 turns only)

// Layout:
// - User text: right-aligned, teal bubble
// - AI text: left-aligned, dark grey bubble
// - Current streaming text has a blinking cursor at the end
// - Auto-scrolls to bottom on new text
// - Transparent background — sits over the voice screen
```

---

#### `components/voice/DiseaseCard.js`

Slides up from the bottom when a disease is detected (listen for `voiceEventEmitter` `DISEASE_RESULT` event).

```js
// Props:
// disease: { name, name_hi, severity, severity_hi, cure_hi, confidence }
// onDismiss: () => void

// Layout (card, bottom sheet style):
// - Disease name in Hindi (large, bold)
// - Severity badge: color-coded (red=High, orange=Medium, green=None)
// - Cure text in Hindi
// - Confidence percentage
// - "नेविगेट करें" button that calls navigate_to_pin tool

// Animation:
// Slides up from off-screen bottom using Animated.spring
// Dismiss: swipe down or tap outside
```

---

#### `components/voice/StatusBanner.js`

Thin banner at the top for non-intrusive status messages.

```js
// Props:
// status: 'idle'|'connecting'|'listening'|'speaking'|'offline'
// message: string (optional override)

// Status → message map:
// idle: 'NeoAgri तैयार है'
// connecting: 'जोड़ा जा रहा है...'
// listening: 'सुन रहा हूँ...'
// speaking: 'NeoAgri बोल रहा है'
// offline: 'ऑफलाइन मोड — Limited features'

// Appearance: semi-transparent dark pill, centered top
// Fades in/out on status change using Animated.timing
```

---

#### `app/live.jsx` (Modify existing — add voice feedback)

Add a voice result overlay on top of existing LiveModeCamera. When TFLite detects a disease:
1. Emit `voiceEventEmitter.emit('DISEASE_RESULT', { ...result })`
2. Emit `voiceEventEmitter.emit('SCAN_COMPLETE', { ... })`
3. Existing camera + frame processor stays exactly as-is — only overlay is added

```jsx
// Add this overlay on top of the existing camera view:
// <DiseaseCard /> — appears when disease detected
// <StatusBanner /> — shows "स्कैन हो रहा है..." while running
```

---

#### Styles Reference

```js
// Global style constants (create lib/voiceStyles.js)
export const COLORS = {
  bg: '#0A0A0A',           // near-black background
  orbTeal: '#00C896',
  orbBlue: '#4A90E2',
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  cardBg: '#1A1A1A',
  severityHigh: '#FF4444',
  severityMedium: '#FFA500',
  severityNone: '#00C896',
}

export const FONTS = {
  hindiLarge: { fontSize: 28, fontWeight: '700', color: COLORS.textPrimary },
  hindiBody:  { fontSize: 18, fontWeight: '400', color: COLORS.textPrimary },
  hindiSmall: { fontSize: 14, fontWeight: '400', color: COLORS.textSecondary },
}
```

---

### Acceptance Criteria

- [ ] VoiceOrb animates correctly for all 5 states — visible demo-ready quality
- [ ] Transcript shows streaming text as it arrives from Agent 1's `transcript` value
- [ ] DiseaseCard slides up when `DISEASE_RESULT` event fires, shows Hindi cure text
- [ ] Navigation to `live.jsx` and `radar.jsx` happens correctly on NAVIGATE events from Agent 2
- [ ] All text on screen is readable — no layout overflow, no clipped Hindi Devanagari script
- [ ] Screen works at landscape if phone is turned (farm use case)
- [ ] `expo-speech` Hindi voice plays on offline keyword match (verify `hi-IN` language pack on test device)

---

### Known Pitfalls

- Hindi Devanagari script requires explicit font support on Android. Use `expo-font` with a font that includes Devanagari (e.g. NotoSans-Devanagari). Default system font on many Android devices may render boxes.
- `Animated.loop` for the ripple effect must be started in a `useEffect` and stopped on unmount — memory leak otherwise.
- `expo-av` metering is async and fires at ~10fps. Throttle amplitude updates to prevent re-render storms on the VoiceOrb.
- `voiceEventEmitter` subscription must be removed in the `useEffect` cleanup return — otherwise duplicate handlers on re-render.

---
---

## AGENT 4 — Backend + Integration QA
**Branch:** `voice/backend` | **Owner:** Agent 4
**Dependency:** Needs OpenAI API key access. Must deploy before Agent 1 can test against real token endpoint.
**Timeline:** Hours 0–6 (backend routes, deploy), Hours 18–26 (integration QA), Hours 30–36 (demo prep)

### Mission
Add 2 routes to `neo-backend`, deploy it live (Railway/Render), and own **end-to-end integration** — making sure Agent 1's session hook, Agent 2's tools, Agent 3's UI, and the backend all work together without breaking offline mode or the existing drone payload flow.

---

### File Deliverables

#### `neo-backend/routes/voice.js` (New File)

```js
// Route 1: Create ephemeral Realtime API session
router.post('/voice/session', async (req, res) => {
  try {
    const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2025-12-17',
        voice: 'alloy',
      }),
    })
    const data = await response.json()
    if (!response.ok) return res.status(500).json({ error: data })
    res.json({
      client_secret: data.client_secret.value,
      session_id: data.id,
      expires_at: data.client_secret.expires_at,
    })
  } catch (err) {
    res.status(500).json({ error: 'Session creation failed', detail: err.message })
  }
})

// Route 2: Log voice interactions (for demo analytics + debugging)
router.post('/voice/log', async (req, res) => {
  const { session_id, command, tool_called, result_preview, timestamp } = req.body
  try {
    await db.query(
      `INSERT INTO voice_logs (session_id, command, tool_called, result_preview, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [session_id, command, tool_called, result_preview, timestamp || new Date()]
    )
    res.json({ ok: true })
  } catch (err) {
    // Non-critical — don't fail if logging fails
    console.error('Voice log error:', err.message)
    res.json({ ok: true })
  }
})
```

#### `neo-backend/migrations/voice_logs.sql` (New File)

```sql
CREATE TABLE IF NOT EXISTS voice_logs (
  id SERIAL PRIMARY KEY,
  session_id TEXT,
  command TEXT,
  tool_called TEXT,
  result_preview TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `neo-backend/app.js` (Modify — add route)

```js
// Add after existing route registrations:
const voiceRoutes = require('./routes/voice')
app.use('/voice', voiceRoutes)
```

---

### Deployment Checklist (Hours 0–4)

1. Push `neo-backend` with new routes to GitHub
2. Deploy to Railway (fastest for Node+Postgres):
   - `railway login && railway up`
   - Set env var: `OPENAI_API_KEY=sk-...`
   - Get deployed URL → add to neoagri-mobile `.env` as `EXPO_PUBLIC_API_URL`
3. Test both routes with `curl`:
   ```bash
   curl -X POST https://your-app.railway.app/voice/session
   # Should return: { client_secret, session_id, expires_at }

   curl -X POST https://your-app.railway.app/voice/log \
     -H "Content-Type: application/json" \
     -d '{"session_id":"test","command":"hello","tool_called":"none"}'
   # Should return: { ok: true }
   ```
4. Share the deployed URL with all agents immediately

---

### Integration QA Checklist (Hours 18–26)

Run these full end-to-end tests after all 4 agents have merged to `main`:

**Online Voice Flow:**
- [ ] App cold start → tap orb → session connects in < 4 seconds
- [ ] Say "नज़दीक के मार्कर दिखाओ" → `scan_nearby_markers` tool fires → AI responds in Hindi
- [ ] Say "कैमरा चालू करो" → `start_live_mode` fires → navigates to live.jsx
- [ ] Say "पहले वाले पर जाओ" → `navigate_to_pin` fires → navigates to radar.jsx
- [ ] Live scan detects disease → DiseaseCard appears → AI speaks cure in Hindi

**Offline Flow:**
- [ ] Turn on airplane mode → status banner shows "ऑफलाइन"
- [ ] Say "स्कैन" → keyword match → `start_live_mode` fires → `expo-speech` speaks Hindi confirmation
- [ ] Scan result saves to SQLite
- [ ] Turn airplane mode off → `sync_pending_scans` auto-triggers → SQLite clears

**No Regressions:**
- [ ] Existing drone payload flow still works (POST to `/payload/receive` unaffected)
- [ ] Existing marker fetch still works (GET `/markers` unaffected)
- [ ] `offlineSync.js` background sync still works independently of voice

---

### Demo Script (Prepare This — Hours 30–36)

Rehearse this exact flow for judges. Speaks directly to the problem statement.

```
[Scene: Show judge the app in idle state]
"यह NeoAgri है — बिना किसी button के, सिर्फ आवाज़ से।"

[Tap orb to start]
Say: "खेत में क्या बीमारी है?"
→ AI: "आपके खेत में 3 संक्रमित स्थान मिले — Frog Eye 92%, Brown Spot 87%..."

Say: "सबसे खतरनाक वाले पर ले चलो"
→ AI: "ठीक है, नेविगेशन शुरू। 2.3 किलोमीटर दूर।"
→ [Radar screen opens automatically]

Say: "ठीक है, कैमरा चालू करो"
→ [Live camera opens — show leaf to camera]
→ [Disease detected — DiseaseCard slides up]
→ AI: "सोयाबीन में Frog Eye बीमारी मिली — मध्यम। मैन्कोज़ेब 2.5g प्रति लीटर पानी में डालें।"

[Turn on airplane mode]
Say: "स्कैन करो"
→ [expo-speech in Hindi: "कैमरा चालू हो गया — ऑफलाइन मोड"]
→ [Camera works offline — result saves to SQLite]
"यह बिना internet के भी काम करता है।"
```

---

### Acceptance Criteria

- [ ] `/voice/session` returns valid ephemeral token (test with actual OpenAI call)
- [ ] `/voice/log` inserts to Postgres without error
- [ ] Backend deployed and publicly accessible (not localhost)
- [ ] All integration QA checks pass
- [ ] Demo script rehearsed — full flow completes in under 3 minutes
- [ ] Existing `/payload/receive` and `/markers` routes untouched and functional

---

## Quick Reference — Who Owns What

| File | Agent |
|---|---|
| `lib/useVoiceSession.js` | Agent 1 |
| `lib/voiceKeywords.js` | Agent 1 |
| `lib/audioPlayer.js` | Agent 1 |
| `lib/VoiceAgentTools.js` | Agent 2 |
| `lib/voiceEventEmitter.js` | Agent 2 |
| `constants/voicePrompt.js` | Agent 2 |
| `models/disease_labels.json` (Hindi fields) | Agent 2 |
| `app/index.jsx` | Agent 3 |
| `components/voice/VoiceOrb.js` | Agent 3 |
| `components/voice/TranscriptFeed.js` | Agent 3 |
| `components/voice/DiseaseCard.js` | Agent 3 |
| `components/voice/StatusBanner.js` | Agent 3 |
| `lib/voiceStyles.js` | Agent 3 |
| `app/live.jsx` (overlay only) | Agent 3 |
| `neo-backend/routes/voice.js` | Agent 4 |
| `neo-backend/migrations/voice_logs.sql` | Agent 4 |
| Integration QA + demo prep | Agent 4 |

---

*Generated for ABV IIITM Hacksagon — NeoAgri Voice | April 2026*
