// PharmaChain client-side QR helpers
// Shared by pharmacy QR checking + patient authenticity check pages.

/**
 * Normalize arbitrary scanned/pasted QR input into a clean MED-XXX / SHIP-XXX token (uppercase).
 * Handles raw tokens, verify/track URLs, legacy JSON payloads, and free text
 * such as "QR ID: MED-1RI0M297MSBEM679" copied from the UI.
 */
export function extractQrId(input: string): string {
  if (!input) return '';
  const trimmed = String(input).trim();
  // URL like http://host/verify/MED-XXX or /track/SHIP-XXX or /track/BOX-XXX
  const urlMatch = trimmed.match(/(?:verify|track)\/([A-Za-z0-9-]+)/i);
  if (urlMatch) return urlMatch[1].toUpperCase();
  // Legacy JSON payload
  try {
    const parsed = JSON.parse(trimmed);
    if (parsed.qrId) return String(parsed.qrId).toUpperCase();
    if (parsed.url) {
      const m = String(parsed.url).match(/(?:verify|track)\/([A-Za-z0-9-]+)/i);
      if (m) return m[1].toUpperCase();
    }
  } catch {}
  // Token anywhere in free text (e.g. "QR ID: MED-1RI0M297MSBEM679")
  const anyMatch = trimmed.match(/(?:MED|SHIP|BOX)-[A-Za-z0-9-]+/i);
  if (anyMatch) return anyMatch[0].toUpperCase();
  return '';
}

/**
 * Normalize arbitrary scanned/pasted input into a clean BOX-XXX token (uppercase).
 * Returns '' if the input is not a valid Transport Box QR.
 */
export function extractBoxId(input: string): string {
  const normalized = extractQrId(input);
  return /^BOX-[A-Za-z0-9-]+$/i.test(normalized) ? normalized : '';
}

