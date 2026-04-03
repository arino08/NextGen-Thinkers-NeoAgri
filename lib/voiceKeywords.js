const KEYWORD_MAP = [
  { patterns: ['स्कैन', 'scan', 'camera', 'कैमरा', 'tasveer'], tool: 'start_live_mode',     args: {} },
  { patterns: ['नक्शा', 'marker', 'pin', 'gps', 'kheti'],       tool: 'scan_nearby_markers', args: {} },
  { patterns: ['जाओ', 'navigate', 'chalo', 'le chalo'],          tool: 'navigate_to_pin',     args: {} },
  { patterns: ['बीमारी', 'disease', 'kya hai', 'batao'],         tool: 'get_disease_info',    args: {} },
  { patterns: ['sync', 'bhejo', 'upload', 'daalo'],              tool: 'sync_pending_scans',  args: {} },
  { patterns: ['status', 'kitna', 'hal', 'report'],              tool: 'report_status',       args: {} },
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
