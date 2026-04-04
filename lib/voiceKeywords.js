const KEYWORD_MAP = [
  { patterns: ['live', 'लाइव', 'chalte', 'चलते', 'continuous'],    tool: 'start_live_mode',     args: {} },
  { patterns: ['photo', 'फोटो', 'तस्वीर', 'picture', 'capture'],   tool: 'capture_photo',       args: {} },
  { patterns: ['स्कैन', 'scan', 'camera', 'कैमरा', 'tasveer'],     tool: 'start_live_mode',     args: {} },
  { patterns: ['नक्शा', 'marker', 'pin', 'gps', 'kheti'],          tool: 'scan_nearby_markers', args: {} },
  { patterns: ['जाओ', 'navigate', 'chalo', 'le chalo'],             tool: 'navigate_to_pin',     args: {} },
  { patterns: ['बीमारी', 'disease', 'kya hai', 'batao'],            tool: 'get_disease_info',    args: {} },
  { patterns: ['sync', 'bhejo', 'upload', 'daalo'],                 tool: 'sync_pending_scans',  args: {} },
  { patterns: ['status', 'kitna', 'hal', 'report'],                 tool: 'report_status',       args: {} },
  { patterns: ['drone', 'ड्रोन', 'booking', 'बुकिंग', 'aerial', 'udan'], tool: 'book_drone_scan', args: {} },
  { patterns: ['history', 'पिछला', 'पुराना', 'itihaas', 'पहले'],   tool: 'get_booking_history', args: {} },
];

export function matchKeyword(spokenText) {
  if (!spokenText) return null;
  const lowerText = spokenText.toLowerCase();

  for (const mapping of KEYWORD_MAP) {
    for (const pattern of mapping.patterns) {
      if (lowerText.includes(pattern.toLowerCase())) {
        return { tool: mapping.tool, args: mapping.args };
      }
    }
  }
  return null;
}
