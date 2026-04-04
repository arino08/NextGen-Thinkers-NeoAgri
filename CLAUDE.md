# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NeoAgri is a voice-first, offline-capable agentic app for Indian soybean farmers. It combines drone-assisted crop disease detection with voice interaction (Hindi) via the OpenAI Realtime API. The repo is a monorepo with three independent sub-projects, each with its own `node_modules` and git history.

## Repository Structure

- **neoagri-mobile/** — React Native (Expo SDK 54) mobile app with voice-first UI, on-device TFLite inference, GPS radar, offline SQLite storage
- **neo-backend/** — Node.js/Express API server with PostgreSQL, serves ephemeral OpenAI tokens and drone payload/marker routes
- **neoagri-dashboard/** — Vanilla JS + Vite web dashboard for drone image disease detection using ONNX Runtime
- **AGENTSPEC.md** — Master spec with architecture, inter-agent contracts, tool schemas, and acceptance criteria

## Critical Rules

1. **JavaScript only** — never use TypeScript (`.js`/`.jsx` files only)
2. **Never import from `@tensorflow/*`** — the mobile app uses `react-native-fast-tflite` exclusively
3. **Drone model (Python/ONNX on server) and app model (TFLite on-device) are separate** — never merge their logic
4. **Offline-first** — every feature must degrade gracefully without internet
5. **All farmer-facing text must support Hindi** — use `expo-speech` with `language: 'hi-IN'`
6. **Frame processor worklets stay in worklets** — no async in VisionCamera v4 worklet context
7. **Use `expo-sqlite` for structured data** — never `AsyncStorage`
8. **Never hardcode OpenAI API key in the app** — fetch ephemeral token from `/voice/session`
9. **No new npm deps without checking if existing Expo SDK 54 packages cover it**

## Build & Run Commands

### Mobile (neoagri-mobile/)
```bash
cd neoagri-mobile
npm start              # Start Expo dev server
npx expo run:android   # Build and run on Android (required after native changes)
npx expo run:ios       # Build and run on iOS
```

### Backend (neo-backend/)
```bash
cd neo-backend
npm start              # Runs migrations then starts server (port 3001)
# Equivalent to: node src/migrate.js && node src/server.js
```
Requires env vars: `OPENAI_API_KEY`, `DATABASE_URL`, `PORT`

### Dashboard (neoagri-dashboard/)
```bash
cd neoagri-dashboard
npm run dev            # Vite dev server on port 5173
npm run build          # Production build to dist/
```

## Architecture

### Mobile App (neoagri-mobile/)

**Routing:** File-based via `expo-router` v4 in `app/` directory. Screens: `index.jsx` (voice home), `live.jsx` (live continuous camera scanning), `capture.jsx` (single photo capture + diagnosis), `radar.jsx` (AR GPS navigation).

**Voice Pipeline (`lib/`):**
- `useVoiceSession.js` — React hook: WebSocket connection to OpenAI Realtime API via backend relay, mic capture via LiveAudioStream, push-to-talk, tool call dispatch, offline fallback
- `VoiceAgentTools.js` — 9 OpenAI function-calling tools (scan_nearby_markers, start_live_mode, capture_photo, navigate_to_pin, get_disease_info, book_drone_scan, get_booking_history, sync_pending_scans, report_status) with Hindi response strings
- `voiceEventEmitter.js` — EventEmitter3 bus connecting tool handlers to UI (events: NAVIGATE, DISEASE_RESULT, SCAN_COMPLETE)
- `voiceKeywords.js` — Offline keyword matcher (Hindi + transliterated) for when WebSocket is unavailable

**On-Device ML:** `react-native-fast-tflite` with `vision-camera-resize-plugin`. Model at `models/soyabean_model_v2.tflite`, labels at `models/disease_labels.json`. Output is float32[7] — 7 classes: Bacterial Pustule, Frogeye Leaf Spot, Healthy (index 2), Rust, Sudden Death Syndrome, Target Leaf Spot, Yellow Mosaic.

**Offline DB (`db/`):** `expo-sqlite` with schema in `schema.js`, marker/scan CRUD in `markers.js`/`scans.js`, sync engine in `offlineSync.js`.

**UI Components (`components/voice/`):** VoiceOrb (animated mic), TranscriptFeed, DiseaseCard, StatusBanner — all use React Native Animated API.

### Backend (neo-backend/src/)

Express app with routes mounted in `app.js`:
- `/payload/receive` — drone payload ingestion
- `/markers` — marker CRUD
- `/scan` — scan results
- `/voice/session` — creates ephemeral OpenAI Realtime API token (proxies to OpenAI)
- `/voice/log` — voice interaction logging to PostgreSQL
- `/drone` — drone booking
- `voiceRelay.js` — WebSocket relay at `/voice/ws`

Migrations run automatically on `npm start` via `migrate.js`.

### Dashboard (neoagri-dashboard/)

Vanilla JS SPA. Runs ONNX model (`model/soybean_uav_modellll.onnx`) in-browser via `onnxruntime-web` for drone image analysis. Entry point is `index.html` + `main.js`.

## Environment Variables

```env
# neoagri-mobile/.env
EXPO_PUBLIC_API_URL=https://your-neo-backend.railway.app
EXPO_PUBLIC_OPENAI_MODEL=gpt-4o-realtime-preview-2025-12-17

# neo-backend/.env
OPENAI_API_KEY=sk-...
DATABASE_URL=postgresql://...
PORT=3001
```

## Inter-Module Contracts

The mobile app's voice system follows a strict pipeline: `useVoiceSession` (WebRTC) -> receives tool calls -> `VoiceAgentTools.dispatchTool()` -> handlers emit events via `voiceEventEmitter` -> UI components react. When offline, `voiceKeywords.matchKeyword()` replaces the WebRTC path.

Tool handler outputs must always be **Hindi strings** (never JSON objects) — OpenAI function output requires string type.
