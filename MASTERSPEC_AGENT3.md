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

## AGENT 3 — Voice-First UI
**Branch:** `voice/ui` | **Needs:** Agent 1's hook signature (contracts above), Agent 2's voiceEventEmitter
**Can mock status with `useState('idle')` until Agent 1's hook is ready.**

---

### Day-0 Setup

- [ ] **S3.1** Install navigation + animation deps
  ```bash
  npx expo install expo-router react-native-screens react-native-safe-area-context
  npx expo install expo-font
  ```
  `[A3] chore(deps): install expo-router and expo-font`

- [ ] **S3.2** Configure `expo-router` in `app.json`
  ```json
  { "expo": { "scheme": "neoagri", "web": { "bundler": "metro" } } }
  ```
  `[A3] chore(config): configure expo-router scheme in app.json`

- [ ] **S3.3** Create `app/_layout.jsx` — root layout
  ```jsx
  import { Stack } from 'expo-router'
  import { registerGlobals } from 'react-native-webrtc'
  registerGlobals()
  export default function Layout() {
    return <Stack screenOptions={{ headerShown: false }} />
  }
  ```
  `[A3] chore(nav): create root layout with expo-router Stack`

- [ ] **S3.4** Create `lib/voiceStyles.js` — global style tokens
  ```js
  export const COLORS = {
    bg: '#080C0A',
    surface: '#111714',
    orbTeal: '#00C896',
    orbBlue: '#4A90E2',
    orbAmber: '#FFA500',
    orbGrey: '#555555',
    textPrimary: '#FFFFFF',
    textSecondary: '#8A9990',
    cardBg: '#161D19',
    severityHigh: '#FF4D4D',
    severityMedium: '#FFA040',
    severityNone: '#00C896',
    border: '#1E2822',
  }
  export const FONTS = {
    hindiHero:  { fontSize: 26, fontWeight: '700', color: '#FFFFFF', lineHeight: 36 },
    hindiBody:  { fontSize: 17, fontWeight: '400', color: '#FFFFFF', lineHeight: 26 },
    hindiSmall: { fontSize: 13, fontWeight: '400', color: '#8A9990', lineHeight: 20 },
    label:      { fontSize: 11, fontWeight: '600', color: '#8A9990', letterSpacing: 1.2, textTransform: 'uppercase' },
  }
  ```
  `[A3] chore(styles): create global color and font tokens`

---

### Phase 1 — VoiceOrb Component
**Goal:** The core visual. Animates for all 5 states. Works standalone before full hook integration.

- [ ] **1.1** Create `components/voice/VoiceOrb.js` — static version first
  - Circle with radius 90 (size 180)
  - Teal color (`COLORS.orbTeal`)
  - `onPress` handler
  - Center mic SVG icon using react-native `<Text>` (🎤 unicode or a simple SVG)
  `[A3] feat(orb): create VoiceOrb static component with press handler`

- [ ] **1.2** Add `idle` state — slow pulsing glow
  ```js
  // Animated.loop: scale 1.0 → 1.05 → 1.0 over 2500ms, Animated.timing easing
  const idlePulse = useRef(new Animated.Value(1)).current
  ```
  `[A3] feat(orb): add idle pulsing animation`

- [ ] **1.3** Add `listening` state — amplitude-reactive scaling
  ```js
  // Props: amplitude (0.0–1.0)
  // Scale: 1.0 + (amplitude * 0.4) — orb grows with voice
  // Use Animated.spring to prevent jitter
  ```
  `[A3] feat(orb): add amplitude-reactive scale for listening state`

- [ ] **1.4** Add `speaking` state — concentric ripple rings
  ```js
  // 3 rings: ripple1, ripple2, ripple3 (staggered 0ms, 400ms, 800ms delay)
  // Each: opacity 0.6→0, scale 1.0→2.0 over 1600ms, Animated.loop
  // Color: COLORS.orbBlue
  ```
  `[A3] feat(orb): add ripple rings for AI speaking state`

- [ ] **1.5** Add `connecting` state — rotating arc
  ```js
  // Animated.loop: rotate 0deg → 360deg over 800ms, linear
  // Arc: thin border on one side (borderTopColor: COLORS.orbAmber, borderRadius: 90)
  ```
  `[A3] feat(orb): add rotating arc for connecting state`

- [ ] **1.6** Add `offline` state — grey orb + static icon
  - Color switches to `COLORS.orbGrey`
  - All animations stop
  - Show a small wifi-off indicator text below orb: "ऑफलाइन"
  `[A3] feat(orb): add offline grey state with indicator text`

- [ ] **1.7** Test all 5 states by cycling through them with a debug button
  `[A3] test(orb): verify all 5 VoiceOrb states render and animate correctly`

---

### Phase 2 — StatusBanner
**Goal:** Non-intrusive top banner showing connection/listening state in Hindi.

- [ ] **2.1** Create `components/voice/StatusBanner.js`
  ```js
  const STATUS_MESSAGES = {
    idle: 'NeoAgri तैयार है',
    connecting: 'जोड़ा जा रहा है...',
    listening: 'सुन रहा हूँ...',
    speaking: 'NeoAgri बोल रहा है',
    offline: 'ऑफलाइन — Limited mode',
  }
  // Layout: pill-shaped, semi-transparent dark (#00000088), centered top
  // Fades in/out on status change (Animated.timing opacity 200ms)
  ```
  `[A3] feat(banner): create StatusBanner with Hindi status messages and fade animation`

---

### Phase 3 — TranscriptFeed
**Goal:** Shows last 3 turns of conversation. Streaming text visible as it arrives.

- [ ] **3.1** Create `components/voice/TranscriptFeed.js`
  - Props: `transcript` (string, current streaming), `history` (array of `{role, text}`)
  - User turns: right-aligned, teal bubble (`#0D3D2C` bg, teal border)
  - AI turns: left-aligned, dark bubble (`COLORS.cardBg`)
  - Show max 3 history items + current streaming text with blinking cursor `|`
  `[A3] feat(transcript): create TranscriptFeed with chat bubble layout`

- [ ] **3.2** Add blinking cursor to streaming transcript
  ```js
  // Animated.loop: opacity 1→0 over 500ms on the '|' character appended to transcript
  ```
  `[A3] feat(transcript): add blinking cursor to streaming transcript text`

- [ ] **3.3** Auto-scroll to bottom on new transcript text
  - Use `FlatList` with `ref.scrollToEnd({ animated: true })` in `useEffect([transcript])`
  `[A3] feat(transcript): auto-scroll to bottom on new transcript content`

---

### Phase 4 — DiseaseCard
**Goal:** Bottom sheet that slides up with disease info when TFLite detects something.

- [ ] **4.1** Create `components/voice/DiseaseCard.js` — static layout
  ```
  [Disease Name in Hindi — large bold]
  [Severity badge: color-coded pill]
  [Cure text in Hindi]
  [Confidence: XX%]
  [Button: "नेविगेट करें →"]
  ```
  - Card bg: `COLORS.cardBg`, rounded top corners (radius 20)
  `[A3] feat(card): create DiseaseCard static layout with Hindi fields`

- [ ] **4.2** Add slide-up animation
  ```js
  // Animated.spring: translateY from SCREEN_HEIGHT to 0 on mount
  // Dismiss: swipe down (PanResponder) or tap backdrop
  const slideAnim = useRef(new Animated.Value(screenHeight)).current
  ```
  `[A3] feat(card): add slide-up Animated.spring and swipe dismiss`

- [ ] **4.3** Add severity badge color coding
  ```js
  const severityColor = {
    'अधिक': COLORS.severityHigh,
    'मध्यम': COLORS.severityMedium,
    'कोई नहीं': COLORS.severityNone,
  }
  ```
  `[A3] feat(card): add color-coded severity badge`

---

### Phase 5 — Main Voice Screen
**Goal:** Full `app/index.jsx` assembled and wired.

- [ ] **5.1** Create `app/index.jsx` — shell with layout
  ```jsx
  // Layout:
  // SafeAreaView fill, bg: COLORS.bg
  // <StatusBanner status={status} />           -- top
  // <VoiceOrb status={status} amplitude={amplitude} onPress={toggle} />  -- center
  // <TranscriptFeed transcript={transcript} history={history} />  -- bottom
  // {diseaseResult && <DiseaseCard disease={diseaseResult} />}    -- overlay
  ```
  `[A3] feat(screen): create main index.jsx voice screen shell`

- [ ] **5.2** Import and wire `useVoiceSession` hook
  - Import `TOOL_HANDLERS` from Agent 2's `VoiceAgentTools.js`
  - `const session = useVoiceSession(TOOL_HANDLERS)`
  - Pass `session.status`, `session.amplitude`, `session.transcript`, `session.history` to components
  `[A3] feat(screen): wire useVoiceSession hook to main screen components`

- [ ] **5.3** Subscribe to `voiceEventEmitter` NAVIGATE events
  ```js
  useEffect(() => {
    const handler = ({ screen, params }) => router.push({ pathname: `/${screen}`, params })
    voiceEventEmitter.on('NAVIGATE', handler)
    return () => voiceEventEmitter.off('NAVIGATE', handler)
  }, [])
  ```
  `[A3] feat(screen): subscribe to NAVIGATE events and route with expo-router`

- [ ] **5.4** Subscribe to `voiceEventEmitter` DISEASE_RESULT events → show DiseaseCard
  ```js
  useEffect(() => {
    const handler = (data) => setDiseaseResult(data)
    voiceEventEmitter.on('DISEASE_RESULT', handler)
    return () => voiceEventEmitter.off('DISEASE_RESULT', handler)
  }, [])
  ```
  `[A3] feat(screen): subscribe to DISEASE_RESULT events and show DiseaseCard`

---

### Phase 6 — Camera Screen
**Goal:** `app/live.jsx` — VisionCamera + TFLite frame processor + DiseaseCard overlay.

- [ ] **6.1** Create `app/live.jsx` with camera permissions request
  ```js
  const { hasPermission, requestPermission } = useCameraPermission()
  // If no permission: show Hindi prompt + request button
  ```
  `[A3] feat(camera): create live.jsx with camera permission request`

- [ ] **6.2** Add VisionCamera with `react-native-fast-tflite` frame processor
  ```js
  // Load model:
  const model = useTensorflowModel(require('../models/neoagri_app_model.tflite'))
  
  // Frame processor (worklet — no async allowed):
  const frameProcessor = useFrameProcessor((frame) => {
    'worklet'
    if (model.state !== 'loaded') return
    const resized = resize(frame, { scale: { width: 224, height: 224 }, pixelFormat: 'rgb', dataType: 'float32' })
    const output = model.model.runSync([resized])
    const scores = output[0]
    const maxIdx = scores.indexOf(Math.max(...scores))
    if (scores[maxIdx] > 0.75) {
      runOnJS(handleDetection)(maxIdx, scores[maxIdx])
    }
  }, [model])
  ```
  `[A3] feat(camera): add TFLite frame processor at 5FPS in VisionCamera`

- [ ] **6.3** Implement `handleDetection(labelIndex, confidence)` outside worklet
  ```js
  function handleDetection(labelIndex, confidence) {
    const labels = require('../models/disease_labels.json')
    const label = labels[String(labelIndex)]
    saveScan({ disease: label.name, label_index: labelIndex, confidence, timestamp: new Date().toISOString() })
    // saveScan (from Agent 2) will emit DISEASE_RESULT + SCAN_COMPLETE events
  }
  ```
  `[A3] feat(camera): implement handleDetection to save scan and trigger DiseaseCard`

- [ ] **6.4** Overlay DiseaseCard on camera screen (same as main screen logic)
  `[A3] feat(camera): add DiseaseCard overlay on disease detection in live mode`

---

### Phase 7 — GPS Radar Screen

- [ ] **7.1** Create `app/radar.jsx` — show GPS arrow pointing to target marker
  - Use `expo-location` `watchPositionAsync` for real-time position
  - Get target marker by `markerId` from route params
  - Calculate bearing to marker: `Math.atan2(...)` formula
  - Show rotating arrow SVG pointing in bearing direction
  - Show distance text in Hindi: `"X.X किलोमीटर दूर"`
  `[A3] feat(radar): create GPS radar screen with bearing arrow and Hindi distance`

- [ ] **7.2** Add "पहुँच गया!" detection
  - If `distance_km < 0.05` (50 meters): play expo-speech "आप लक्ष्य पर पहुँच गए!"
  - Show green checkmark overlay
  `[A3] feat(radar): add arrival detection with Hindi voice confirmation`

---
---