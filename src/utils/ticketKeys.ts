const TICKET_KEY_PATTERN = /^[A-Z][A-Z0-9_]{1,19}-\d+$/i;

export function normalizeTicketKey(value: string): string | null {
  const key = value.trim().toUpperCase();
  return TICKET_KEY_PATTERN.test(key) ? key : null;
}
