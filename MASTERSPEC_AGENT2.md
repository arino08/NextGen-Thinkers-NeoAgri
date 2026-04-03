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

## AGENT 2 — Tool Integration Layer
**Branch:** `voice/tools` | **Unblocks:** Agent 1 (needs TOOL_SCHEMAS + SYSTEM_PROMPT) and Agent 3 (needs voiceEventEmitter events)
**Priority:** Finish Phase 1 (DB) and Phase 2 (tool schemas) ASAP so Agent 1 can unblock Phase 3.

---

### Day-0 Setup

- [ ] **S2.1** Install database + networking deps (run in same project as Agent 1)
  ```bash
  npx expo install expo-sqlite expo-location
  npm install eventemitter3
  ```
  `[A2] chore(deps): install expo-sqlite, expo-location, eventemitter3`

- [ ] **S2.2** Install react-native-vision-camera + fast-tflite
  ```bash
  npx expo install react-native-vision-camera vision-camera-resize-plugin
  npm install react-native-fast-tflite
  npx expo run:android  # must compile — check agent_docs/native_setup.md for issues
  ```
  `[A2] chore(deps): install vision camera and fast-tflite native modules`

- [ ] **S2.3** Create `agent_docs/native_setup.md` documenting any build issues encountered
  `[A2] docs(native): document native module setup steps and known issues`

---

### Phase 1 — SQLite Database Layer
**Goal:** Full offline database up. All CRUD functions exported and tested.

- [ ] **1.1** Create `db/schema.js` — table definitions + `initDB()`
  ```js
  import * as SQLite from 'expo-sqlite'
  
  const db = SQLite.openDatabaseSync('neoagri.db')
  
  export async function initDB() {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS drone_markers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        capture_id TEXT UNIQUE NOT NULL,
        latitude REAL NOT NULL,
        longitude REAL NOT NULL,
        disease TEXT,
        confidence REAL,
        timestamp TEXT,
        synced INTEGER DEFAULT 1
      );
      CREATE TABLE IF NOT EXISTS manual_scans (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        capture_id TEXT UNIQUE NOT NULL,
        latitude REAL,
        longitude REAL,
        disease TEXT NOT NULL,
        confidence REAL NOT NULL,
        image_path TEXT,
        timestamp TEXT NOT NULL,
        synced INTEGER DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS voice_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        started_at TEXT,
        commands_count INTEGER DEFAULT 0
      );
    `)
  }
  export { db }
  ```
  `[A2] feat(db): create SQLite schema with drone_markers, manual_scans, voice_sessions`

- [ ] **1.2** Create `db/markers.js` — drone marker CRUD
  ```js
  export async function insertMarker(marker) → void
  export async function getMarkerById(capture_id) → Marker | null
  export async function getAllMarkers() → Array<Marker>
  export async function clearMarkers() → void
  ```
  `[A2] feat(db): create drone marker CRUD functions`

- [ ] **1.3** Create `db/scans.js` — manual scan CRUD
  ```js
  export async function insertScan(scan) → void
  export async function getPendingScans() → Array<Scan>
  export async function markScansAsSynced(ids) → void
  ```
  `[A2] feat(db): create manual scan CRUD with pending queue`

- [ ] **1.4** Create `db/offlineSync.js` — exported API used by all agents
  ```js
  export { initDB } from './schema'
  
  export async function getOfflineMarkers() {
    // Get all markers + calculate distance from current GPS position
    const pos = await Location.getLastKnownPositionAsync()
    const markers = await getAllMarkers()
    return markers.map(m => ({
      ...m,
      distance_km: calculateDistance(pos.coords, { latitude: m.latitude, longitude: m.longitude })
    })).sort((a, b) => a.distance_km - b.distance_km)
  }
  
  export async function saveScan(scanData) → void  // inserts to manual_scans
  export async function getPendingScans() → Array<Scan>
  
  export async function syncPendingScans() {
    // GET /markers → insert to drone_markers table
    // POST /scan/sync with pending manual scans → mark as synced
    // Returns { synced: number }
  }
  
  function calculateDistance(coord1, coord2) → number  // Haversine formula, returns km
  ```
  `[A2] feat(sync): create offlineSync.js with getOfflineMarkers and syncPendingScans`

- [ ] **1.5** Test DB: `initDB()` → `insertMarker(mock)` → `getOfflineMarkers()` → logs correct data
  Write test in a temp file, delete after.
  `[A2] test(db): verify SQLite insert and retrieval with mock data`

---

### Phase 2 — Tool Schemas (Unblocks Agent 1)
**Goal:** All 6 tool schemas defined. Agent 1 can import `TOOL_SCHEMAS` now.

- [ ] **2.1** Create `lib/VoiceAgentTools.js` skeleton with `TOOL_SCHEMAS` array
  Define all 6 schemas as valid OpenAI function_call objects:
  - `scan_nearby_markers` — no required params
  - `start_live_mode` — no params
  - `navigate_to_pin` — optional `marker_id` (string) or `index` (number)
  - `get_disease_info` — required `disease_name` (string)
  - `sync_pending_scans` — no params
  - `report_status` — no params
  `[A2] feat(tools): define all 6 OpenAI function_call schemas`

- [ ] **2.2** Create `constants/voicePrompt.js` with `SYSTEM_PROMPT`
  ```js
  export const SYSTEM_PROMPT = `
  You are NeoAgri, an AI farming assistant for Indian soybean farmers.
  ALWAYS respond in simple Hindi (Devanagari preferred).
  Keep responses under 2 sentences — short and actionable.
  Never use technical jargon.
  Use tools immediately when farmer mentions field, disease, camera, or GPS.
  After every tool result, confirm in Hindi and ask what to do next.
  If offline, acknowledge it and use available local tools.
  `
  ```
  `[A2] feat(tools): create system prompt with Hindi instruction`

- [ ] **2.3** Create `lib/voiceEventEmitter.js`
  ```js
  import EventEmitter from 'eventemitter3'
  export const voiceEventEmitter = new EventEmitter()
  // Event types (for documentation):
  // 'NAVIGATE'       → { screen: 'live-mode'|'radar'|'home', params?: {} }
  // 'DISEASE_RESULT' → { disease, severity, cure_hi, confidence }
  // 'SCAN_COMPLETE'  → { capture_id, disease, timestamp }
  ```
  `[A2] feat(events): create voiceEventEmitter for cross-component navigation`

- [ ] **2.4** Update `agent_docs/progress.md` — note TOOL_SCHEMAS and voiceEventEmitter are ready
  `[A2] docs(progress): TOOL_SCHEMAS and voiceEventEmitter ready for Agent 1 and Agent 3`

---

### Phase 3 — Disease Labels
**Goal:** Full disease labels JSON with Hindi fields. TFLite output maps to cure strings.

- [ ] **3.1** Create `models/disease_labels.json` with all 4 classes + Hindi fields
  ```json
  {
    "0": {
      "name": "Caterpillar and Semilooper Pest Attack",
      "name_hi": "इल्ली और सेमीलूपर कीट",
      "severity": "High",
      "severity_hi": "अधिक",
      "cure": "Apply Chlorpyrifos 20EC @ 2ml/liter",
      "cure_hi": "क्लोरपाइरीफ़ॉस 20EC 2ml प्रति लीटर पानी में डालें"
    },
    "1": {
      "name": "Healthy Soyabean",
      "name_hi": "स्वस्थ सोयाबीन",
      "severity": "None",
      "severity_hi": "कोई नहीं",
      "cure": "No treatment needed",
      "cure_hi": "कोई उपचार आवश्यक नहीं"
    },
    "2": {
      "name": "Soyabean Frog Leaf Eye",
      "name_hi": "सोयाबीन फ्रॉग आई",
      "severity": "Medium",
      "severity_hi": "मध्यम",
      "cure": "Spray Mancozeb 2.5g/liter",
      "cure_hi": "मैन्कोज़ेब 2.5g प्रति लीटर पानी में छिड़काव करें"
    },
    "3": {
      "name": "Soyabean Spectoria Brown Spot",
      "name_hi": "सोयाबीन भूरा धब्बा",
      "severity": "Medium",
      "severity_hi": "मध्यम",
      "cure": "Apply Carbendazim 1g/liter",
      "cure_hi": "कार्बेन्डाज़िम 1g प्रति लीटर पानी में डालें"
    }
  }
  ```
  `[A2] feat(labels): create disease_labels.json with Hindi names, severity and cures`

---

### Phase 4 — Tool Handlers
**Goal:** All 6 tools actually do something. Each handler returns a Hindi string.

- [ ] **4.1** Implement `scan_nearby_markers` handler
  - Call `getOfflineMarkers()` from `db/offlineSync.js`
  - If empty: `"आपके खेत में अभी कोई संक्रमण नहीं मिला।"`
  - Else: `"X संक्रमित स्थान मिले: [disease] Y km दूर, ..."` (max 3 in summary)
  `[A2] feat(tools): implement scan_nearby_markers handler with Hindi output`

- [ ] **4.2** Implement `start_live_mode` handler
  - Emit `voiceEventEmitter.emit('NAVIGATE', { screen: 'live-mode' })`
  - Return `"कैमरा चालू हो गया। पत्ते के पास फ़ोन लाएं।"`
  `[A2] feat(tools): implement start_live_mode handler with navigation event`

- [ ] **4.3** Implement `navigate_to_pin` handler
  - Get markers → find target by `marker_id` or `index`
  - Emit `voiceEventEmitter.emit('NAVIGATE', { screen: 'radar', params: { markerId } })`
  - Return `"ठीक है, X.X किलोमीटर दूर नेविगेशन शुरू।"`
  `[A2] feat(tools): implement navigate_to_pin handler with radar navigation`

- [ ] **4.4** Implement `get_disease_info` handler
  - Load `disease_labels.json`
  - Fuzzy match `disease_name` against all label names (case-insensitive includes)
  - Return `"[name_hi]: गंभीरता [severity_hi]. उपाय: [cure_hi]"`
  `[A2] feat(tools): implement get_disease_info handler with fuzzy name matching`

- [ ] **4.5** Implement `sync_pending_scans` handler
  - Call `syncPendingScans()` from offlineSync.js
  - Return `"X स्कैन सफलतापूर्वक सर्वर पर भेजे गए।"` or `"कोई pending स्कैन नहीं।"`
  `[A2] feat(tools): implement sync_pending_scans handler`

- [ ] **4.6** Implement `report_status` handler
  - Call both `getOfflineMarkers()` and `getPendingScans()`
  - Return `"X मार्कर cached हैं। Y स्कैन sync के लिए बाकी।"`
  `[A2] feat(tools): implement report_status handler`

---

### Phase 5 — dispatchTool + Error Safety

- [ ] **5.1** Implement `dispatchTool(name, args)` in `VoiceAgentTools.js`
  ```js
  export async function dispatchTool(name, args) {
    try {
      const handler = TOOL_HANDLERS[name]
      if (!handler) return `${name} tool नहीं मिला।`
      return await handler(args)
    } catch (err) {
      console.error(`Tool ${name} failed:`, err)
      return `कुछ गड़बड़ हुई। दोबारा कोशिश करें।`
    }
  }
  ```
  `[A2] feat(tools): implement dispatchTool with error safety and Hindi fallback`

- [ ] **5.2** Wire DISEASE_RESULT event into live mode result
  In `db/scans.js` `insertScan()`, also emit:
  ```js
  voiceEventEmitter.emit('DISEASE_RESULT', {
    disease: scan.disease,
    severity: labels[scan.label_index].severity_hi,
    cure_hi: labels[scan.label_index].cure_hi,
    confidence: scan.confidence,
  })
  ```
  `[A2] feat(events): emit DISEASE_RESULT event when scan is saved to DB`

---
---