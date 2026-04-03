export async function getOfflineMarkers() {
  return [
    { id: '1', lat: 28.5355, lng: 77.3910, label: 'Marker 1' },
    { id: '2', lat: 28.5360, lng: 77.3915, label: 'Marker 2' }
  ];
}
export async function saveScan(scanData) {}
export async function getPendingScans() { return []; }
export async function syncPendingScans() { return { synced: 0 }; }
export async function initDB() {}
