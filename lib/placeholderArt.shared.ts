// Client-safe classification half of the placeholder-art capability: the deck
// UI and server validation both classify placeholder URIs by prefix, but the
// generator itself (lib/placeholderArt.ts) must never enter a client bundle —
// so the constants live apart from the DiceBear import.
export const PLACEHOLDER_URI_PREFIX = 'data:image/svg+xml;base64,';

// Generated SVGs run ~1–2KB (~2–3KB once base64'd); the cap protects the
// item_images text column from an oversized client-submitted URI.
export const PLACEHOLDER_URI_MAX_LENGTH = 8192;

export function isPlaceholderUri(url: string): boolean {
  return url.startsWith(PLACEHOLDER_URI_PREFIX);
}
