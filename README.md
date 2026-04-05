# NeoAgri

NeoAgri is a comprehensive, voice-first, and offline-capable agentic application designed specifically for Indian soybean farmers. It combines drone-assisted crop disease detection with natural voice interaction (in Hindi) powered by the OpenAI Realtime API. 

The system provides farmers with accessible, localized, and resilient technology for detecting crop diseases, navigating to affected areas, and managing agricultural data, even in areas with limited or no internet connectivity.

---

## Table of Contents
1. [System Architecture and Flow](#system-architecture-and-flow)
2. [Repository Structure](#repository-structure)
3. [Features](#features)
4. [Prerequisites](#prerequisites)
5. [Local Setup Instructions](#local-setup-instructions)
6. [Environment Variables](#environment-variables)
7. [Technical Constraints and Guidelines](#technical-constraints-and-guidelines)

---

## System Architecture and Flow

NeoAgri operates as a distributed system with three primary components interacting to provide a seamless experience: Mobile App, Backend API, and Web Dashboard.

### High-Level Architecture

1. **Mobile Application (Edge Node):** Acts as the primary interface for farmers. It runs on Android/iOS via React Native (Expo) and executes machine learning inference strictly on-device using TensorFlow Lite. It prioritizes offline capabilities using local SQLite databases.
2. **Backend Service (Relay & Persistence):** A Node.js/Express server backed by PostgreSQL. It acts as a secure relay for OpenAI WebRTC voice sessions (never exposing the API key to the client), ingests drone survey data, and stores telemetry.
3. **Web Dashboard (Analysis Node):** A lightweight web client using ONNX Runtime for complex, browser-based analysis of drone imagery.

### Interaction Flows

**1. Voice Interaction Pipeline (Online):**
* User speaks into the mobile app in Hindi.
* Audio streams via WebRTC (`useVoiceSession` hook) to the Backend.
* Backend proxies the stream to OpenAI Realtime API.
* OpenAI generates textual responses or functional tool calls.
* Tool calls (e.g., `scan_nearby_markers`, `navigate_to_pin`) are intercepted by `VoiceAgentTools`.
* Handlers execute local logic and emit events via `voiceEventEmitter` to update the React UI seamlessly.

**2. Voice Interaction Pipeline (Offline Fallback):**
* If the WebSocket connection fails, the app degrades gracefully to an offline mode.
* It utilizes a local keyword matching engine (`voiceKeywords.js`) to process Hindi and transliterated commands to execute basic app functions.

**3. Disease Detection Flow:**
* Mobile continuous camera feed or captured photo is processed locally without network reliance.
* `react-native-fast-tflite` runs inference on a 7-class Soybean disease model.
* Results are displayed to the user and saved locally to Expo SQLite (`expo-sqlite`).
* Data syncs intelligently with the Postgres backend when a connection is restored using `offlineSync.js`.

---

## Repository Structure

This repository is a monorepo containing three independent sub-projects, each with its own package dependencies and isolated environments.

```text
neoagri/
├── neoagri-mobile/         # React Native (Expo SDK 54) mobile app
│   ├── app/                # File-based routing (Index, Live, Capture, Radar)
│   ├── components/         # UI Elements (VoiceOrb, DiseaseCard, StatusBanner)
│   ├── db/                 # Local SQLite schema, CRUD, and offline sync
│   ├── lib/                # Voice pipeline, event routers, audio management
│   └── models/             # On-device TFLite models and labels
├── neo-backend/            # Node.js/Express API server
│   ├── src/
│   │   ├── routes/         # REST API endpoints (Markers, Scans, Drone, Voice)
│   │   ├── migrations/     # PostgreSQL SQL migration files
│   │   └── voiceRelay.js   # WebSocket and WebRTC proxy for OpenAI
└── neoagri-dashboard/      # Vanilla JS + Vite web dashboard
    ├── model/              # ONNX models for drone imagery
    └── public/             # Static assets
```

---

## Features

### Mobile Application
* **Voice-First UI:** Animated microphone interfaces and transcript feeds interacting fluidly with the user in Hindi via `expo-speech`.
* **Real-time On-Device ML:** Continuous camera scanning and localized image classification (7 soybean classes including Healthy, Rust, Frogeye Leaf Spot).
* **GPS Radar AR:** Visual radar for navigating to diseased patches identified by drones or previous scans.
* **Offline-First Storage:** Robust local SQLite data management that queues interactions and syncs when online.

### Backend Infrastructure
* **Secure Token Vending:** Proxies OpenAI authentication, generating ephemeral tokens to keep client applications secure.
* **Drone Payload Ingestion:** Endpoints to receive, process, and store drone payload and geospatial marker data.
* **Automated Migrations:** Database schemas stay synchronized seamlessly on server startup.

### Web Dashboard
* **Client-side Inference:** Utilizes `onnxruntime-web` to analyze drone imagery directly within the browser, reducing server compute load.

---

## Prerequisites

To run this project locally, ensure your development environment includes:

* **Node.js** (v18 or higher recommended)
* **npm** (v9 or higher recommended)
* **PostgreSQL** (Running instance with a created database)
* **Expo CLI** (For mobile development)
* **Android Studio / Xcode** (For building and running native mobile applications)

---

## Local Setup Instructions

Follow these instructions in order: Backend, then Mobile or Dashboard.

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <repository-directory>
```

### 2. Backend Setup (`neo-backend`)

The backend must be running for the mobile app to acquire voice session tokens and sync data.

```bash
cd neo-backend
npm install
```

Create a `.env` file in the `neo-backend` directory (see Environment Variables section below).

Run the server. This command will automatically run database migrations before starting the Express listen server on port 3001:

```bash
npm start
```

### 3. Mobile App Setup (`neoagri-mobile`)

Open a new terminal window/tab.

```bash
cd neoagri-mobile
npm install
```

Create a `.env` file in the `neoagri-mobile` directory.

Since this app uses custom native code (e.g., TFLite, Vision Camera), you must build the native application using Expo Prebuild.

**For Android:**
```bash
npm start
# In another terminal or pressing 'a' in the Expo CLI prompt:
npx expo run:android
```

**For iOS:**
```bash
npm start
# In another terminal or pressing 'i' in the Expo CLI prompt:
npx expo run:ios
```

### 4. Dashboard Setup (`neoagri-dashboard`)

Open a new terminal window/tab.

```bash
cd neoagri-dashboard
npm install
```

Start the Vite development server:
```bash
npm run dev
```
The dashboard will be available in your browser at `http://localhost:5173`.

To create a production build:
```bash
npm run build
```

---

## Environment Variables

### Backend (`neo-backend/.env`)
```env
OPENAI_API_KEY=sk-your-openai-api-key-here
DATABASE_URL=postgresql://user:password@localhost:5432/neoagri_db
PORT=3001
```

### Mobile App (`neoagri-mobile/.env`)
```env
# Point this to your local machine IP if testing on a physical device
# or localhost (10.0.2.2 for Android emulator)
EXPO_PUBLIC_API_URL=http://<your-backend-ip>:3001
EXPO_PUBLIC_OPENAI_MODEL=gpt-4o-realtime-preview-2025-12-17
```

---

## Technical Constraints and Guidelines

If you are contributing to this project, you must adhere to the following architectural rules:

1. **Language:** JavaScript exclusively. TypeScript (`.ts`/`.tsx`) is not used.
2. **Mobile ML Architecture:** The mobile application exclusively uses `react-native-fast-tflite`. Do not install or import `@tensorflow/*` libraries.
3. **Model Separation:** The drone model (Python/ONNX via Dashboard/Server) and the mobile model (TFLite) maintain discrete logic. Do not merge their processing pipelines.
4. **Offline Resilience:** Every mobile feature must degrade gracefully when disconnected.
5. **Localization:** All farmer-facing copy, text outputs, and Voice AI instructions must strictly target Hindi (`hi-IN`).
6. **Mobile Storage:** Use `expo-sqlite` for structured local storage. Avoid `AsyncStorage`.
7. **Security:** The mobile app must never contain hardcoded OpenAI API keys; logic must route through the backend `/voice/session` endpoint.
8. **Worklet Constraints:** VisionCamera v4 frame processor worklets must not contain asynchronous code.
