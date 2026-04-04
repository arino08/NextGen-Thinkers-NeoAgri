# NeoAgri Backend API Contract

## Tech Stack
Node.js, Express, Postgres (or Supabase for speed), OpenAI API (for intent routing/STT).

## Core Endpoints

### 1. Voice Command Processing
`POST /api/voice/process`
- **Accepts:** Multipart form-data containing audio blob.
- **Returns:** ```json
  {
    "intent": "NAVIGATE_TO_DISEASE",
    "transcript": "kaha beemari hai?",
    "ai_response_hi": "Main aapko beemari wale hisse tak le ja raha hoon.",
    "action_payload": { "lat": 11.23, "lng": 77.49 }
  }