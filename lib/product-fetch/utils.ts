const MAX_IMAGE_CANDIDATES = 10;

/**
 * Cheap string-level pre-check before a URL is handed to Zyte — rejects the
 * obviously-internal hosts (localhost, bare names, raw IPs, IPv6). Zyte fetches
 * the page on its own infrastructure, so the app holds no SSRF surface of its
 * own; this is just hygiene on what we forward.
 */
export function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) return true;
  if (host.endsWith('.local') || host.endsWith('.internal')) return true;
  if (!host.includes('.')) return true;
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return true;
  if (host.startsWith('[') || host.includes(':')) return true;
  return false;
}

/**
 * Coerces an extractor's price into a bare numeric string, or undefined when
 * it isn't strictly numeric (currency symbols, empty, NaN all reject).
 */
export function normalizePrice(value: unknown): string | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed !== '' && Number.isFinite(Number(trimmed))) {
      return trimmed;
    }
  }
  return undefined;
}

/**
 * Normalizes an extractor's raw image list into the seam's candidate shape:
 * exact-string deduped, capped at 10, order preserved (first = main image).
 * Returns undefined when nothing usable remains so the field stays absent.
 */
export function normalizeImageUrls(
  urls: (string | undefined)[]
): string[] | undefined {
  const seen = new Set<string>();
  for (const url of urls) {
    if (!url || seen.has(url)) continue;
    seen.add(url);
    if (seen.size === MAX_IMAGE_CANDIDATES) break;
  }
  return seen.size > 0 ? [...seen] : undefined;
}
