import { db } from './schema';

export async function insertMarker(marker) {
  const query = `
    INSERT OR IGNORE INTO drone_markers (capture_id, latitude, longitude, disease, confidence, timestamp, synced)
    VALUES (?, ?, ?, ?, ?, ?, ?);
  `;
  await db.runAsync(query, [
    marker.capture_id,
    marker.latitude,
    marker.longitude,
    marker.disease,
    marker.confidence,
    marker.timestamp || marker.created_at || new Date().toISOString(),
    marker.synced !== undefined ? marker.synced : 1
  ]);
}

export async function getMarkerById(capture_id) {
  return await db.getFirstAsync('SELECT * FROM drone_markers WHERE capture_id = ?;', [capture_id]);
}

export async function getAllMarkers() {
  return await db.getAllAsync('SELECT * FROM drone_markers;');
}

export async function clearMarkers() {
  await db.runAsync('DELETE FROM drone_markers;');
}
