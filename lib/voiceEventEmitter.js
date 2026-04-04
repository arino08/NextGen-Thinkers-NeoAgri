import EventEmitter from 'eventemitter3';
export const voiceEventEmitter = new EventEmitter();

// Event types (for documentation):
// 'NAVIGATE'       → { screen: 'live-mode'|'radar'|'home', params?: {} }
// 'DISEASE_RESULT' → { disease, severity, cure_hi, confidence }
// 'SCAN_COMPLETE'  → { capture_id, disease, timestamp }
