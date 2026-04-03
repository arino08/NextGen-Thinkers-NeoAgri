export async function fetchSessionToken() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
  const res = await fetch(`${apiUrl}/voice/session`, { method: 'POST' });
  if (!res.ok) throw new Error('Token fetch failed: ' + res.status);
  return res.json();  // { client_secret, session_id, ... }
}
