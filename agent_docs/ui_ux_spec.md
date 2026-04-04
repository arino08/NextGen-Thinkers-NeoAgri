# NeoAgri Voice - UI/UX Specification

## Design Philosophy: "Ambient Agritech"
The app should feel less like a traditional mobile app and more like a smart, living entity inside the phone. 

## Core Screens
1. **The Pulse (Home/Listening Screen):**
   - **No standard buttons.** The center of the screen features a breathing, fluid shape (built with Skia or Reanimated). 
   - **States:** - *Idle:* Slow, green/earth-tone breathing.
     - *Listening:* Expands, reacts to mic input volume, shifting to vibrant energetic colors.
     - *Thinking:* Fast, smooth orbital rotation.
     - *Speaking:* Pulses in time with the TTS audio output.
   - **Text:** Huge, highly legible Hindi/English transcriptions of what the AI heard and its response.

2. **The Field Radar (Drone Sync Screen):**
   - A highly stylized, dark-themed map or abstract radar view. 
   - When offline drone data is retrieved, the UI should use fluid layout transitions to plot infected zones.

3. **The Viewfinder (Live Camera Mode):**
   - Minimalist camera UI. No clunky overlays.
   - When a disease is detected, use haptic feedback (`impactAsync('heavy')`) and a smooth, frosted-glass bottom sheet sliding up with the voice announcing the result.

## Animation Directives for Agent
- Always use `withSpring` over `withTiming` in Reanimated for a natural feel.
- Combine opacity fades with slight Y-axis translations for text entering/leaving the screen.
- Trigger haptics on *every* state change (Start listening, Stop listening, Error, Success).