/**
 * Generates a locally-unique id (timestamp + randomness). Sufficient for
 * device-local primary keys; no external dependency required.
 */
export function generateId(): string {
  const time = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 10);
  return `${time}-${rand}`;
}
