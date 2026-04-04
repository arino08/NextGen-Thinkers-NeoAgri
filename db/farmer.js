import { db } from './schema';

const MAX_ATTEMPTS = 3;
const LOCKOUT_MINUTES = 30;
const MAX_BOOKINGS_PER_DAY = 3;

// Simple hash — XOR + rotate, good enough for local PIN storage without crypto lib
function hashPin(pin) {
  const str = String(pin).replace(/\s+/g, '').replace(/[^0-9]/g, '');
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & hash; // 32-bit int
  }
  return String(Math.abs(hash));
}

export function normalizePin(raw) {
  // Accept "एक दो तीन चार", "1 2 3 4", "1234", mix — extract digits only
  const hindiToDigit = {
    'शून्य': '0', 'एक': '1', 'दो': '2', 'तीन': '3', 'चार': '4',
    'पाँच': '5', 'पांच': '5', 'छह': '6', 'छः': '6', 'सात': '7',
    'आठ': '8', 'नौ': '9',
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
  };
  let normalized = raw.toLowerCase();
  for (const [word, digit] of Object.entries(hindiToDigit)) {
    normalized = normalized.replace(new RegExp(word, 'g'), digit);
  }
  return normalized.replace(/[^0-9]/g, '');
}

export async function hasFarmerProfile() {
  const row = await db.getFirstAsync('SELECT id FROM farmer_profile LIMIT 1;');
  return !!row;
}

export async function getFarmerProfile() {
  return await db.getFirstAsync('SELECT * FROM farmer_profile LIMIT 1;');
}

export async function setupFarmerPin(pin, name = null, phone = null) {
  const digits = normalizePin(pin);
  if (digits.length < 4) return { ok: false, error: 'PIN must be at least 4 digits' };

  const hash = hashPin(digits);
  await db.runAsync('DELETE FROM farmer_profile;'); // only one profile
  await db.runAsync(
    'INSERT INTO farmer_profile (name, phone, pin_hash) VALUES (?, ?, ?);',
    [name, phone, hash]
  );
  return { ok: true };
}

export async function verifyPin(pin) {
  const profile = await getFarmerProfile();
  if (!profile) return { ok: false, reason: 'no_profile' };

  // Check lockout
  if (profile.locked_until) {
    const lockedUntil = new Date(profile.locked_until);
    if (new Date() < lockedUntil) {
      const minsLeft = Math.ceil((lockedUntil - new Date()) / 60000);
      return { ok: false, reason: 'locked', minsLeft };
    }
    // Lockout expired — reset
    await db.runAsync('UPDATE farmer_profile SET failed_attempts = 0, locked_until = NULL;');
  }

  const digits = normalizePin(pin);
  const hash = hashPin(digits);

  if (hash === profile.pin_hash) {
    await db.runAsync('UPDATE farmer_profile SET failed_attempts = 0, locked_until = NULL;');
    return { ok: true };
  }

  // Wrong PIN
  const attempts = (profile.failed_attempts || 0) + 1;
  if (attempts >= MAX_ATTEMPTS) {
    const lockUntil = new Date(Date.now() + LOCKOUT_MINUTES * 60000).toISOString();
    await db.runAsync(
      'UPDATE farmer_profile SET failed_attempts = ?, locked_until = ?;',
      [attempts, lockUntil]
    );
    return { ok: false, reason: 'locked_now', attemptsLeft: 0 };
  }

  await db.runAsync('UPDATE farmer_profile SET failed_attempts = ?;', [attempts]);
  return { ok: false, reason: 'wrong_pin', attemptsLeft: MAX_ATTEMPTS - attempts };
}

export async function canBookDroneToday() {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const row = await db.getFirstAsync(
    'SELECT COUNT(*) as count FROM booking_log WHERE booked_at > ?;',
    [since]
  );
  return (row?.count || 0) < MAX_BOOKINGS_PER_DAY;
}

export async function logBooking(bookingId) {
  await db.runAsync('INSERT INTO booking_log (booking_id) VALUES (?);', [bookingId]);
}
