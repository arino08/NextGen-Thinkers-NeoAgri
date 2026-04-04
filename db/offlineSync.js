import * as Location from 'expo-location';
import { initDB } from './schema';
import { getAllMarkers, insertMarker } from './markers';
import { insertScan, getPendingScans as fetchPendingScans, markScansAsSynced } from './scans';

export { initDB };

function calculateDistance(coord1, coord2) {
  const R = 6371; // km
  const dLat = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const dLon = (coord2.longitude - coord1.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(coord1.latitude * Math.PI / 180) * Math.cos(coord2.latitude * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export async function getOfflineMarkers() {
  let pos;
  try {
    pos = await Location.getLastKnownPositionAsync({});
  } catch (err) {
    console.log("Could not fetch location:", err);
  }

  const markers = await getAllMarkers();

  if (!pos) {
    return markers.map(m => ({ ...m, distance_km: 0 })); // Fallback if no location
  }

  return markers.map(m => ({
    ...m,
    distance_km: calculateDistance(pos.coords, { latitude: m.latitude, longitude: m.longitude })
  })).sort((a, b) => a.distance_km - b.distance_km);
}

export async function saveScan(scanData) {
  return await insertScan(scanData);
}

export async function getPendingScans() {
  return await fetchPendingScans();
}

export async function syncPendingScans() {
  const API_URL = process.env.EXPO_PUBLIC_API_URL;
  let synced = 0;

  if (!API_URL) {
    console.warn('API URL not configured, skipping sync.');
    return { synced };
  }

  try {
    // GET /markers -> insert to drone_markers
    const markersRes = await fetch(`${API_URL}/markers`);
    if (markersRes.ok) {
      const markersData = await markersRes.json();
      // Backend returns raw array OR { data: [...] }
      const markersList = Array.isArray(markersData) ? markersData : (markersData?.data || []);
      if (markersList.length > 0) {
        console.log(`[SYNC] Fetched ${markersList.length} markers from server`);
        for (const m of markersList) {
          await insertMarker(m);
        }
      }
    }

    // POST /scan/sync -> sync manual_scans
    const pending = await fetchPendingScans();
    if (pending.length > 0) {
      const syncRes = await fetch(`${API_URL}/scan/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scans: pending })
      });
      if (syncRes.ok) {
        const idsToMark = pending.map(s => s.id);
        await markScansAsSynced(idsToMark);
        synced = pending.length;
      }
    }
  } catch (error) {
    console.warn("Sync failed (offline?):", error);
  }

  return { synced };
}
