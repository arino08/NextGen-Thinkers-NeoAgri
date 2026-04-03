import { db } from './schema';

export async function insertScan(scan) {
  const query = `
    INSERT OR REPLACE INTO manual_scans (capture_id, latitude, longitude, disease, confidence, image_path, timestamp, synced)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?);
  `;
  await db.runAsync(query, [
    scan.capture_id,
    scan.latitude || null,
    scan.longitude || null,
    scan.disease,
    scan.confidence,
    scan.image_path || null,
    scan.timestamp,
    scan.synced !== undefined ? scan.synced : 0
  ]);
}

export async function getPendingScans() {
  return await db.getAllAsync('SELECT * FROM manual_scans WHERE synced = 0;');
}

export async function markScansAsSynced(ids) {
  if (!ids || ids.length === 0) return;
  const placeholders = ids.map(() => '?').join(',');
  const query = `UPDATE manual_scans SET synced = 1 WHERE id IN (${placeholders});`;
  await db.runAsync(query, ids);
}
