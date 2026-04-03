export const TOOL_SCHEMAS = [
  {
    name: 'scan_nearby_markers',
    description: 'Fetches all drone-detected disease markers near the farmer. Returns GPS pins from cached offline data.',
    parameters: {
      type: 'object',
      properties: {
        radius_km: { type: 'number', description: 'Search radius in kilometers. Default 5.' }
      },
      required: []
    }
  },
  {
    name: 'start_live_mode',
    description: 'Activates the phone camera with real-time TFLite disease detection at 5 FPS.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
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
  },
  {
    name: 'get_disease_info',
    description: 'Returns disease name, severity, and recommended treatment for a crop disease.',
    parameters: {
      type: 'object',
      properties: {
        disease_name: { type: 'string', description: 'Name of the disease from scan result.' }
      },
      required: ['disease_name']
    }
  },
  {
    name: 'sync_pending_scans',
    description: 'Uploads pending offline scan results to the server when internet is available.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    name: 'report_status',
    description: 'Reports current app status — how many markers are cached, how many scans are pending sync.',
    parameters: { type: 'object', properties: {}, required: [] }
  }
];

import { getOfflineMarkers, getPendingScans, syncPendingScans } from "../db/offlineSync";
import { voiceEventEmitter } from "./voiceEventEmitter";
import diseaseLabels from "../models/disease_labels.json";

export const TOOL_HANDLERS = {
  start_live_mode: async () => {
    try {
      voiceEventEmitter.emit("NAVIGATE", { screen: "live-mode" });
      return "कैमरा चालू हो गया। पत्ते के पास फ़ोन लाएं।";
    } catch (e) {
      return "कैमरा चालू करने में त्रुटि हुई।";
    }
  },
  scan_nearby_markers: async ({ radius_km = 5 }) => {
    try {
      const markers = await getOfflineMarkers();
      if (!markers || markers.length === 0) return "आपके खेत में अभी कोई बीमारी नहीं मिली है।";
      const summary = markers.slice(0, 3).map(m => `${m.disease} (${(m.confidence * 100).toFixed(0)}%) — ${m.distance_km.toFixed(1)} km दूर`).join(", ");
      return `${markers.length} संक्रमित स्थान मिले: ${summary}`; 
    } catch (e) {
      return "मार्कर लोड करने में त्रुटि हुई।";
    }
  },
  navigate_to_pin: async ({ marker_id, index }) => {
    try {
      const markers = await getOfflineMarkers();
      const target = marker_id
        ? markers.find(m => m.capture_id === marker_id)
        : markers[Math.max(0, (index || 1) - 1)];
      if (!target) return "मार्कर नहीं मिला।";
      voiceEventEmitter.emit("NAVIGATE", { screen: "radar", params: { markerId: target.capture_id } });
      return `ठीक है, ${target.distance_km.toFixed(1)} किलोमीटर दूर नेविगेशन शुरू।`;
    } catch (e) {
      return "नेविगेशन शुरू होने में त्रुटि हुई।";
    }
  },
  get_disease_info: async ({ disease_name }) => {
    try {
      if (!disease_name) return "कृपया बीमारी का नाम बताएं।";
      const entry = Object.values(diseaseLabels).find(l => 
        l.name.toLowerCase().includes(disease_name.toLowerCase()) || 
        l.name_hi.toLowerCase().includes(disease_name.toLowerCase())
      );
      if (!entry) return `${disease_name} की जानकारी नहीं मिली।`;
      return `${entry.name_hi}: गंभीरता ${entry.severity_hi}। उपाय: ${entry.cure_hi}`;
    } catch (e) {
      return "बीमारी की जानकारी लोड करने में त्रुटि हुई।";
    }
  }
};
export async function dispatchTool(name, args) { return ''; }

