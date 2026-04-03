# NeoAgri Voice — Full From-Scratch Agent Spec
**Hackathon:** ABV IIITM Hacksagon | **36 Hours** | **Model:** Gemini 3.1 Pro → fallback Claude Opus 4.6
> Everything is built from scratch. No prior code exists. Read every section before writing a single line.

---

## COMMIT RULES (Non-Negotiable for All Agents)

```
Format: [A{n}] type(scope): short description

Types: feat | fix | chore | refactor | test
Scope: area of change (e.g. audio, webrtc, tools, ui, db, backend)

Examples:
  [A1] feat(audio): setup expo-av recording with PCM16 format
  [A2] feat(tools): add scan_nearby_markers schema and handler
  [A3] feat(orb): VoiceOrb idle and listening state animations
  [A4] feat(backend): POST /voice/session ephemeral token route

Rules:
  - Commit after EVERY completed todo item — not in batches
  - Max 5 files per commit
  - Never commit broken/crashing code — test before commit
  - Write a one-line description in the commit body if the change is non-obvious
```

---

## MASTER SPEC — All Agents Read First

### What We're Building
NeoAgri Voice is a **voice-only agentic mobile app** for Indian soybean farmers. Built on Expo SDK 54 / React Native 0.81.5. The farmer speaks Hindi commands — the app detects crop diseases using an on-device TFLite model, navigates to GPS pins from drone scans, and works completely offline in the field.

### Two Separate Backends (Never Confuse)
| Backend | Repo | Role |
|---|---|---|
| `neo-backend` | Agent 4 builds | Node/Express API — farmer app talks to this |
| `website_station_backend` | **Pre-exists, do not touch** | Python drone server — out of scope |

### Project Structure (Both Repos — Create From Scratch)

```
neoagri-mobile/                     ← Expo app
├── app/
│   ├── index.jsx                   ← Main voice screen (Agent 3)
│   ├── live.jsx                    ← Camera + TFLite screen (Agent 3)
│   └── radar.jsx                   ← GPS navigation screen (Agent 3)
├── components/
│   └── voice/
│       ├── VoiceOrb.js             (Agent 3)
│       ├── TranscriptFeed.js       (Agent 3)
│       ├── DiseaseCard.js          (Agent 3)
│       └── StatusBanner.js         (Agent 3)
├── lib/
│   ├── useVoiceSession.js          (Agent 1)
│   ├── audioPlayer.js              (Agent 1)
│   ├── voiceKeywords.js            (Agent 1)
│   ├── VoiceAgentTools.js          (Agent 2)
│   ├── voiceEventEmitter.js        (Agent 2)
│   └── voiceStyles.js              (Agent 3)
├── db/
│   ├── schema.js                   (Agent 2)
│   └── offlineSync.js              (Agent 2)
├── constants/
│   └── voicePrompt.js              (Agent 2)
├── models/
│   ├── neoagri_app_model.tflite    ← Binary — download separately
│   └── disease_labels.json         (Agent 2)
├── agent_docs/
│   ├── progress.md                 ← Each agent updates after every phase
│   ├── architecture.md
│   ├── backend.md
│   └── native_setup.md
└── .env

neo-backend/                        ← Express API
├── src/
│   ├── app.js
│   ├── db.js
│   ├── routes/
│   │   ├── payload.js
│   │   ├── markers.js
│   │   ├── scans.js
│   │   └── voice.js                (Agent 4)
│   └── migrations/
│       ├── 001_init.sql
│       └── 002_voice_logs.sql
├── .env
└── package.json
```

### Absolute Rules
1. **JavaScript only** — never `.ts`, never `interface`, never `: string` type annotations
2. **react-native-fast-tflite** for ML — never TensorFlow.js
3. **expo-sqlite** for structured data — never AsyncStorage
4. **expo-speech** with `language: 'hi-IN'` for all Hindi TTS
5. **Offline always degrades gracefully** — check network before every API call
6. **VisionCamera worklets stay as worklets** — no async calls inside frame processors
7. **Never hardcode OpenAI API key in mobile app** — always use ephemeral token from `/voice/session`
8. **Update `agent_docs/progress.md` after every phase** — this is how agents stay in sync

### TFLite Model Output (Agent 2 must use this exactly)
```
Model: models/neoagri_app_model.tflite
Input: float32[1][224][224][3]  (normalized 0–1, RGB)
Output: float32[4]

Index → Disease mapping:
  0 → "Caterpillar and Semilooper Pest Attack"  severity: High
  1 → "Healthy Soyabean"                         severity: None
  2 → "Soyabean Frog Leaf Eye"                   severity: Medium
  3 → "Soyabean Spectoria Brown Spot"            severity: Medium
```

### Inter-Agent Contracts (Do Not Change Signatures Without Notifying All Agents)
```js
// Agent 1 exports from lib/useVoiceSession.js
export function useVoiceSession(toolHandlers)
→ { status, transcript, history, isListening, amplitude, startSession, stopSession, speak }
// status: 'idle'|'connecting'|'listening'|'speaking'|'offline'
// amplitude: number 0.0–1.0 (mic level, used by VoiceOrb)

// Agent 2 exports from lib/VoiceAgentTools.js
export const TOOL_SCHEMAS   // Array — OpenAI function_call schemas
export const TOOL_HANDLERS  // Object — { toolName: async (args) => string }
export const SYSTEM_PROMPT  // String
export async function dispatchTool(name, args) → string

// Agent 2 exports from lib/voiceEventEmitter.js
export const voiceEventEmitter  // EventEmitter instance
// Events: 'NAVIGATE' | 'DISEASE_RESULT' | 'SCAN_COMPLETE'

// Agent 2 exports from db/offlineSync.js
export async function getOfflineMarkers() → Array<Marker>
export async function saveScan(scanData) → void
export async function getPendingScans() → Array<Scan>
export async function syncPendingScans() → { synced: number }
export async function initDB() → void

// Agent 4 backend contracts
POST /voice/session → { client_secret, session_id, expires_at }
POST /voice/log     → { ok: true }
POST /payload/receive → { ok: true }       (drone backend — NOT voice related)
GET  /markers       → Array<Marker>
POST /scan/sync     → { synced: number }
```

### Git Worktree Setup (Run Once — All Agents)
```bash
# In neoagri-mobile root:
git init && git add . && git commit -m "chore: initial project scaffold"
git branch voice/pipeline && git branch voice/tools
git branch voice/ui && git branch voice/backend

git worktree add ../neoagri-pipeline  voice/pipeline   # Agent 1
git worktree add ../neoagri-tools     voice/tools      # Agent 2
git worktree add ../neoagri-ui        voice/ui         # Agent 3
# Agent 4 works in neo-backend repo, separate from mobile

# Merge order when done: tools → pipeline → ui → main
```

### Environment Files
```env
# neoagri-mobile/.env
EXPO_PUBLIC_API_URL=https://your-neo-backend.railway.app
EXPO_PUBLIC_OPENAI_MODEL=gpt-4o-realtime-preview-2025-12-17

# neo-backend/.env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://user:pass@host:5432/neoagri
PORT=3001
NODE_ENV=production
```

---
---

---
---

## AGENT 1 — Voice Pipeline
**Branch:** `voice/pipeline` | **Blocking:** Agent 3 (needs `useVoiceSession` hook)
**Unblocks:** Nothing until Phase 4 complete. Agent 3 can mock `status` until then.

---

### Day-0 Setup (Do First, Commit Each Step)

- [ ] **S1.1** Init Expo project
  ```bash
  npx create-expo-app@latest neoagri-mobile --template blank
  cd neoagri-mobile
  ```
  `[A1] chore(init): create expo blank project SDK54`

- [ ] **S1.2** Install core audio + network deps
  ```bash
  npx expo install expo-av @react-native-community/netinfo
  ```
  `[A1] chore(deps): install expo-av and netinfo`

- [ ] **S1.3** Install WebRTC
  ```bash
  npm install react-native-webrtc
  npx expo run:android  # verify native build completes without error
  ```
  `[A1] chore(deps): install react-native-webrtc and verify native build`

- [ ] **S1.4** Install expo-speech + expo-location
  ```bash
  npx expo install expo-speech expo-location
  ```
  `[A1] chore(deps): install expo-speech and expo-location`

- [ ] **S1.5** Create folder structure
  ```bash
  mkdir -p lib db constants components/voice models agent_docs
  touch agent_docs/progress.md
  echo "## Agent 1 Progress\n- [x] S1: Setup complete" > agent_docs/progress.md
  ```
  `[A1] chore(structure): create folder layout and progress doc`

- [ ] **S1.6** Configure AndroidManifest.xml permissions
  Add to `android/app/src/main/AndroidManifest.xml`:
  ```xml
  <uses-permission android:name="android.permission.RECORD_AUDIO" />
  <uses-permission android:name="android.permission.INTERNET" />
  <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
  <uses-permission android:name="android.permission.CAMERA" />
  ```
  `[A1] chore(android): add required permissions to AndroidManifest`

---

### Phase 1 — Audio Recording Setup
**Goal:** Farmer's voice is captured as PCM16 audio. Test: record 3 seconds, play back.

- [ ] **1.1** Create `lib/audioRecorder.js`
  - Configure `Audio.setAudioModeAsync` to prevent echo: `INTERRUPTION_MODE_ANDROID_DO_NOT_MIX`, `playsInSilentModeIOS: true`
  - Export `startRecording()` → returns `{ recording, uri }`
  - Export `stopRecording(recording)` → returns `{ uri, durationMs }`
  - Export `getAmplitude(recording)` → returns `number` 0.0–1.0 from `getStatusAsync().metering`
  `[A1] feat(audio): create audioRecorder with PCM16 config and amplitude metering`

- [ ] **1.2** Create `lib/audioPlayer.js`
  - Export `playAudioUri(uri)` → plays local file via `Audio.Sound`
  - Export `playPCM16Base64(base64, sampleRate=24000)` → decodes and plays OpenAI audio chunks
  - Export `stopPlayback()` → stops all active sounds
  `[A1] feat(audio): create audioPlayer with PCM16 base64 decode support`

- [ ] **1.3** Test audio round-trip in a temp `app/test-audio.jsx` screen
  - Button: start recording → 3 seconds → stop → play back
  - Verify amplitude value is non-zero while speaking
  - Delete screen after test passes
  `[A1] test(audio): verify record-playback round trip on device`

---

### Phase 2 — WebRTC Connection
**Goal:** Establish a WebRTC peer connection to OpenAI Realtime API using an ephemeral token.
**Blocker:** Needs Agent 4's `/voice/session` endpoint. Use this mock token function until it's live:
```js
// TEMPORARY — replace with real fetch when Agent 4 deploys
async function getMockToken() {
  return { client_secret: process.env.EXPO_PUBLIC_OPENAI_API_KEY_TEMP, session_id: 'mock-' + Date.now() }
}
```

- [ ] **2.1** Create `lib/realtimeSession.js` — token fetcher
  ```js
  export async function fetchSessionToken() {
    const res = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/voice/session`, { method: 'POST' })
    if (!res.ok) throw new Error('Token fetch failed')
    return res.json()  // { client_secret, session_id, expires_at }
  }
  ```
  `[A1] feat(webrtc): create session token fetcher from neo-backend`

- [ ] **2.2** Add WebRTC polyfill registration to `app/_layout.jsx`
  ```js
  import { registerGlobals } from 'react-native-webrtc'
  registerGlobals()
  ```
  `[A1] feat(webrtc): register react-native-webrtc globals in layout`

- [ ] **2.3** Create `lib/peerConnection.js` — WebRTC setup
  - Export `createPeerConnection()` → returns configured `RTCPeerConnection`
  - Export `addAudioTrack(pc, stream)` → adds microphone track
  - Export `createOffer(pc)` → returns SDP offer string
  - Export `setRemoteAnswer(pc, sdpAnswer)` → sets remote description
  `[A1] feat(webrtc): create peer connection factory functions`

- [ ] **2.4** Create `lib/openaiHandshake.js` — SDP exchange with OpenAI
  ```js
  export async function exchangeSDP(sdpOffer, clientSecret, model) {
    const res = await fetch(`https://api.openai.com/v1/realtime?model=${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${clientSecret}`,
        'Content-Type': 'application/sdp',
      },
      body: sdpOffer,
    })
    if (!res.ok) throw new Error('SDP exchange failed: ' + res.status)
    return res.text()  // returns SDP answer
  }
  ```
  `[A1] feat(webrtc): create OpenAI SDP handshake function`

- [ ] **2.5** Test WebRTC connection — say "hello" and verify audio response plays back
  - Create temp test button in `app/test-webrtc.jsx`
  - Full flow: token → peer → offer → exchange → answer → audio plays
  - Delete test screen after passing
  `[A1] test(webrtc): verify full WebRTC handshake with OpenAI Realtime API`

---

### Phase 3 — Data Channel + Event Handling
**Goal:** AI can receive tool call requests and voice transcripts are captured.

- [ ] **3.1** Create `lib/dataChannel.js` — data channel manager
  - Export `createDataChannel(pc)` → returns `dc` with name `"oai-events"`
  - Export `sendEvent(dc, eventObj)` → `dc.send(JSON.stringify(eventObj))`
  - Export `onServerEvent(dc, handler)` → parses incoming JSON and calls handler
  `[A1] feat(datachannel): create data channel manager`

- [ ] **3.2** Create `lib/sessionConfig.js` — session update sender
  - Export `sendSessionUpdate(dc, toolSchemas, systemPrompt)` — sends the `session.update` event:
    ```js
    {
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
        }
      }
    }
    ```
  `[A1] feat(datachannel): create session update config sender`

- [ ] **3.3** Create `lib/eventRouter.js` — routes OpenAI events
  Handle these event types:
  ```
  response.audio.delta               → buffer base64 PCM chunk → play via audioPlayer
  response.audio_transcript.delta    → append to transcript state
  response.function_call_arguments.done → call dispatchTool → send tool result back
  response.done                      → set status to 'idle'
  error                              → log + set status to 'idle'
  ```
  `[A1] feat(datachannel): create OpenAI event router for all response types`

- [ ] **3.4** Implement tool result response
  After `dispatchTool` resolves, send back:
  ```js
  dc.send(JSON.stringify({
    type: 'conversation.item.create',
    item: { type: 'function_call_output', call_id, output: resultString }
  }))
  dc.send(JSON.stringify({ type: 'response.create' }))
  ```
  `[A1] feat(datachannel): send tool call results back to Realtime API`

---

### Phase 4 — Main Hook Assembly
**Goal:** `useVoiceSession` hook fully wired. This is what Agent 3 imports.

- [ ] **4.1** Create `lib/useVoiceSession.js` — assemble all Phase 1–3 pieces
  ```js
  export function useVoiceSession(toolHandlers) {
    const [status, setStatus] = useState('idle')
    const [transcript, setTranscript] = useState('')
    const [history, setHistory] = useState([])
    const [amplitude, setAmplitude] = useState(0)
    // ... refs for pc, dc, recording, amplitudeInterval
    
    async function startSession() { ... }  // full connection flow
    function stopSession() { ... }         // cleanup everything
    function speak(text) { ... }           // expo-speech TTS
    
    return { status, transcript, history, isListening: status==='listening',
             amplitude, startSession, stopSession, speak }
  }
  ```
  `[A1] feat(hook): assemble useVoiceSession hook with full pipeline`

- [ ] **4.2** Add amplitude polling inside `startSession`
  - Start 100ms interval calling `getAmplitude(recording)` while `status === 'listening'`
  - Stop interval when status changes away from listening
  `[A1] feat(hook): add amplitude polling for VoiceOrb animation feed`

- [ ] **4.3** Add NetInfo online/offline watch
  - On mount, subscribe to `NetInfo.addEventListener`
  - If offline → set `status = 'offline'`
  - If online and `status === 'offline'` → set `status = 'idle'`
  `[A1] feat(hook): add NetInfo listener for offline status transitions`

- [ ] **4.4** Write `agent_docs/progress.md` update — mark Phase 4 done, note hook is ready for Agent 3
  `[A1] docs(progress): mark voice pipeline complete, hook ready`

---

### Phase 5 — Offline Keyword Fallback
**Goal:** Basic voice commands work without internet using `expo-speech` recognition + pattern matching.

- [ ] **5.1** Create `lib/voiceKeywords.js` — keyword → tool mapping
  ```js
  const KEYWORD_MAP = [
    { patterns: ['स्कैन', 'scan', 'camera', 'कैमरा', 'tasveer'], tool: 'start_live_mode',     args: {} },
    { patterns: ['नक्शा', 'marker', 'pin', 'gps', 'kheti'],       tool: 'scan_nearby_markers', args: {} },
    { patterns: ['जाओ', 'navigate', 'chalo', 'le chalo'],          tool: 'navigate_to_pin',     args: {} },
    { patterns: ['बीमारी', 'disease', 'kya hai', 'batao'],         tool: 'get_disease_info',    args: {} },
    { patterns: ['sync', 'bhejo', 'upload', 'daalo'],              tool: 'sync_pending_scans',  args: {} },
    { patterns: ['status', 'kitna', 'hal', 'report'],              tool: 'report_status',       args: {} },
  ]
  export function matchKeyword(spokenText) → { tool, args } | null
  ```
  `[A1] feat(offline): create Hindi keyword matcher for offline mode`

- [ ] **5.2** Wire offline mode into `useVoiceSession`
  - When `status === 'offline'` and `startSession()` called:
    - Use `expo-speech` to listen (if available), else show a visual text input
    - On recognized text → `matchKeyword(text)` → `dispatchTool(tool, args)`
    - Speak result via `expo-speech` with `language: 'hi-IN'`
  `[A1] feat(offline): wire offline keyword mode into useVoiceSession`

- [ ] **5.3** Test offline flow
  - Turn on airplane mode
  - Tap mic → say "scan" → verify `start_live_mode` fires + expo-speech says Hindi confirmation
  `[A1] test(offline): verify keyword matching and Hindi TTS in offline mode`

---
---