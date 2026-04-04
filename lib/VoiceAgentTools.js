export const TOOL_SCHEMAS = [
  {
    type: 'function',
    name: 'scan_nearby_markers',
    description: 'Fetches all drone-detected disease markers near the farmer from cached offline data. Use when farmer asks about their field status, nearby diseases, or drone scan results.',
    parameters: {
      type: 'object',
      properties: {
        radius_km: { type: 'number', description: 'Search radius in kilometers. Default 5.' }
      },
      required: []
    }
  },
  {
    type: 'function',
    name: 'start_live_mode',
    description: 'Opens the phone camera with real-time continuous AI disease detection while farmer walks through the field. Use when farmer wants live scanning, continuous monitoring, or says "live camera".',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    type: 'function',
    name: 'capture_photo',
    description: 'Opens camera to take a single photo of a leaf/crop and analyze it for disease. Use when farmer wants to take a picture, photo, or scan a specific leaf. Returns full disease details.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    type: 'function',
    name: 'navigate_to_pin',
    description: 'Opens AR GPS radar navigation to guide farmer walking to a specific disease marker in the field.',
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
    type: 'function',
    name: 'get_disease_info',
    description: 'Returns disease name, severity, and recommended treatment for a KNOWN crop disease. Only use when the disease has already been identified by scanning.',
    parameters: {
      type: 'object',
      properties: {
        disease_name: { type: 'string', description: 'Name of the disease from scan result.' }
      },
      required: ['disease_name']
    }
  },
  {
    type: 'function',
    name: 'book_drone_scan',
    description: 'Books a drone scan service for the farmer\'s field. Use when farmer asks about drone, aerial survey, drone booking, ड्रोन, or wants their field scanned from above.',
    parameters: {
      type: 'object',
      properties: {
        crop_type: { type: 'string', description: 'Type of crop. Default: soybean.' },
        area_acres: { type: 'number', description: 'Field area in acres. Default: 1.' },
        urgency: { type: 'string', description: 'Urgency level: normal or urgent. Default: normal.' }
      },
      required: []
    }
  },
  {
    type: 'function',
    name: 'get_booking_history',
    description: 'Shows history of previous drone service bookings. Use when farmer asks about past bookings, drone history, previous scans, पिछला, पुराना booking, or booking status.',
    parameters: {
      type: 'object',
      properties: {
        status: { type: 'string', description: 'Filter by status: pending, dispatched, completed, cancelled. Default: all.' }
      },
      required: []
    }
  },
  {
    type: 'function',
    name: 'sync_pending_scans',
    description: 'Uploads pending offline scan results to the server when internet is available.',
    parameters: { type: 'object', properties: {}, required: [] }
  },
  {
    type: 'function',
    name: 'report_status',
    description: 'Reports current app status — how many markers are cached, how many scans are pending sync.',
    parameters: { type: 'object', properties: {}, required: [] }
  }
];

import { getOfflineMarkers, getPendingScans, syncPendingScans } from "../db/offlineSync";
import { voiceEventEmitter } from "./voiceEventEmitter";
import diseaseLabels from "../models/disease_labels.json";

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export const TOOL_HANDLERS = {
  start_live_mode: async () => {
    try {
      voiceEventEmitter.emit("NAVIGATE", { screen: "live" });
      return "लाइव कैमरा चालू हो गया। खेत में चलते हुए फ़ोन दिखाएं, AI लगातार स्कैन करेगा।";
    } catch (e) {
      return "कैमरा चालू करने में त्रुटि हुई।";
    }
  },
  capture_photo: async () => {
    try {
      voiceEventEmitter.emit("NAVIGATE", { screen: "capture" });
      return "कैमरा खुल गया। पत्ते की फोटो लें, AI बीमारी बताएगा।";
    } catch (e) {
      return "कैमरा खोलने में त्रुटि हुई।";
    }
  },
  scan_nearby_markers: async ({ radius_km = 5 }) => {
    try {
      const markers = await getOfflineMarkers();
      if (!markers || markers.length === 0) return "आपके खेत में अभी कोई बीमारी नहीं मिली है। कैमरे से स्कैन करें — बोलें 'कैमरा चालू करो'।";
      const summary = markers.slice(0, 3).map((m, i) =>
        `${i + 1}. ${m.disease} (${(m.confidence * 100).toFixed(0)}%) — ${m.distance_km?.toFixed(1) || '?'} km दूर`
      ).join("; ");
      return `${markers.length} संक्रमित स्थान मिले: ${summary}। किसी पर जाने के लिए बोलें "पहले वाले पर ले चलो"।`;
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
      if (!target) return "मार्कर नहीं मिला। पहले 'खेत स्कैन करो' बोलें।";
      voiceEventEmitter.emit("NAVIGATE", { screen: "radar", params: { markerId: target.capture_id } });
      return `ठीक है, ${target.distance_km?.toFixed(1) || ''} किलोमीटर दूर ${target.disease} पर नेविगेशन शुरू।`;
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
      if (!entry) return `${disease_name} की जानकारी नहीं मिली। कैमरे से स्कैन करें — बोलें 'कैमरा चालू करो'।`;
      return `${entry.name_hi}: गंभीरता ${entry.severity_hi}। उपाय: ${entry.cure_hi}`;
    } catch (e) {
      return "बीमारी की जानकारी लोड करने में त्रुटि हुई।";
    }
  },
  book_drone_scan: async ({ crop_type = 'soybean', area_acres = 1, urgency = 'normal' }) => {
    try {
      const response = await fetch(`${API_URL}/drone/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          crop_type,
          area_acres,
          urgency,
          farmer_name: 'App User',
        }),
      });
      const data = await response.json();
      if (!response.ok) return "ड्रोन बुकिंग में त्रुटि हुई। बाद में कोशिश करें।";
      const bookingId = data.booking?.booking_id || 'N/A';
      const urgencyText = urgency === 'urgent' ? 'तुरंत' : 'सामान्य';
      return `ड्रोन स्कैन बुक हो गया! बुकिंग ID: ${bookingId}। ${area_acres} एकड़ ${crop_type} फसल के लिए ${urgencyText} स्कैन। ऑपरेटर जल्द ड्रोन भेजेगा।`;
    } catch (e) {
      return "ड्रोन बुकिंग सर्वर उपलब्ध नहीं है। कृपया बाद में कोशिश करें।";
    }
  },
  get_booking_history: async ({ status } = {}) => {
    try {
      const url = status
        ? `${API_URL}/drone/bookings?status=${status}`
        : `${API_URL}/drone/bookings`;
      const response = await fetch(url);
      if (!response.ok) return "बुकिंग इतिहास लोड नहीं हो सका। सर्वर उपलब्ध नहीं है।";
      const data = await response.json();
      const bookings = data.bookings || data.data || [];
      if (bookings.length === 0) return "कोई पुरानी ड्रोन बुकिंग नहीं मिली।";
      const statusMap = { pending: 'बाकी', dispatched: 'भेजा गया', completed: 'पूरा', cancelled: 'रद्द' };
      const summary = bookings.slice(0, 5).map((b, i) => {
        const st = statusMap[b.status] || b.status;
        const date = new Date(b.created_at).toLocaleDateString('hi-IN');
        return `${i + 1}. ${b.booking_id} — ${st}, ${b.area_acres || 1} एकड़, ${date}`;
      }).join("; ");
      return `${bookings.length} बुकिंग मिलीं: ${summary}`;
    } catch (e) {
      return "बुकिंग इतिहास लोड करने में त्रुटि हुई। इंटरनेट जांचें।";
    }
  },
  sync_pending_scans: async () => {
    try {
      const result = await syncPendingScans();
      if (!result || result.synced === 0) return "कोई pending स्कैन नहीं था।";
      return `${result.synced} स्कैन सफलतापूर्वक अपलोड हो गए।`;
    } catch (e) {
      return "स्कैन सिंक करने में त्रुटि हुई।";
    }
  },
  report_status: async () => {
    try {
      const [markers, pending] = await Promise.all([getOfflineMarkers(), getPendingScans()]);
      return `${markers.length} मार्कर cached हैं। ${pending.length} स्कैन sync के लिए बाकी हैं।`;
    } catch (e) {
      return "स्टेटस लोड करने में त्रुटि हुई।";
    }
  }
};

export async function dispatchTool(name, args) {
  try {
    const handler = TOOL_HANDLERS[name];
    if (!handler) return `${name} tool नहीं मिला।`;
    return await handler(args);
  } catch (err) {
    console.error(`Tool ${name} failed:`, err);
    return `कुछ गड़बड़ हुई। दोबारा कोशिश करें।`;
  }
}
