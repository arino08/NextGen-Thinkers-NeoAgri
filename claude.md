# NeoAgri Voice - Master AI Directive

## Project Overview
NeoAgri is a Voice-First, AI-driven crop disease detection app for Indian farmers. This is a 36-hour hackathon build (ABV IIITM Hacksagon). The app is entirely operated via Voice (Hindi/English) with an "Awwwards-level", highly fluid, ambient visual interface. 

## The UI/UX Mandate (CRITICAL)
- **Visual Identity:** Ambient, futuristic yet grounded in nature. Dark mode by default for battery saving, but highly visible outdoors.
- **Interactivity:** The UI is reactive to voice. Use `react-native-reanimated` for fluid, physics-based soundwaves, glowing orbs, or ambient background gradients that pulse when the user speaks or the AI thinks.
- **Accessibility:** Massive typography, high contrast, heavy use of haptics (`expo-haptics`) to confirm actions without requiring the user to look at the screen.

## Stack Requirements
- **Framework:** Expo SDK 54 / React Native 0.81.5
- **Language:** JavaScript ONLY (No TypeScript. Never output TS).
- **Navigation:** `expo-router`
- **Voice/Audio:** `expo-audio` (recording) + `expo-speech` (TTS) + Backend STT/LLM.
- **Animations:** `react-native-reanimated` v3 + `react-native-skia` (for complex fluid visuals).
- **ML/Camera:** `react-native-vision-camera` v4 + `react-native-fast-tflite` (offline inference).
- **Offline Storage:** `expo-sqlite`
- **Styling:** TailwindCSS via `nativewind` (or standard StyleSheet if complex reanimated styles are needed).

## Core Rules for the AI Agent
1. **Never use TypeScript.**
2. **Always handle offline-first:** The farm has no internet. Ensure fallback UI states and local TFLite processing work seamlessly.
3. **Voice is the primary input:** All user flows must assume the user initiated them via voice. 
4. **Hindi First:** All UI copy and TTS must support 'hi-IN'.
5. **Read Before Writing:** Always check `agent_docs/` before implementing a new feature to ensure alignment with the architecture.
6. **Update Progress:** After completing a milestone, update `agent_docs/progress.md`.