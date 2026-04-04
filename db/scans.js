import { db } from './schema';
import { voiceEventEmitter } from '../lib/voiceEventEmitter';
import diseaseLabels from '../models/disease_labels.json';

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

  if (scan.label_index !== undefined && diseaseLabels[scan.label_index]) {
    const label = diseaseLabels[scan.label_index];
    voiceEventEmitter.emit('DISEASE_RESULT', {
      name: label.name,
      name_hi: label.name_hi,
      severity: label.severity,
      severity_hi: label.severity_hi,
      cure: label.cure,
      cure_hi: label.cure_hi,
      confidence: scan.confidence
    });
  }
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
