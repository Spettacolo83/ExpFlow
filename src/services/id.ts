/**
 * Generates a locally-unique id (timestamp + randomness). Sufficient for
 * device-local primary keys on a single-user offline app. NOT suitable for
 * multi-device sync (uses Math.random, not a collision-resistant UUID) — if
 * cloud sync is added later, switch to a proper UUID (e.g. expo-crypto).
 */
export function generateId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${time}-${rand}`;
}
