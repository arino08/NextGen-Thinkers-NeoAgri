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

export const TOOL_HANDLERS = {};
export async function dispatchTool(name, args) { return ''; }

