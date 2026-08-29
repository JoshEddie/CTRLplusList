import { liftFeatures } from '@/lib/altvatar/legibility';
import { toNativeOptions } from '@/lib/altvatar/resolve';
import { styleOf } from '@/lib/altvatar/registry';
import { openmojiArtUrl } from '@/lib/altvatar/styles/openmoji';
import type { AltvatarOptions } from '@/lib/altvatar/types';
import { Avatar, Style } from '@dicebear/core';

// The only module importing a `@dicebear/*` style. Each definition is reached
// through its own dynamic import inside a switch, so the bundler splits one
// chunk per style and the customizer pulls only the one selected, only on
// open. On the server — where the save path derives the art — the import is
// inert. The paths are written out rather than built from the id: a template
// literal defeats the bundler's static analysis, which would pull all sixty
// definitions the package publishes into the chunk instead of the four.
async function definitionOf(id: string): Promise<unknown> {
  switch (id) {
    case 'personas':
      return (await import('@dicebear/styles/personas.json')).default;
    case 'toon-head':
      return (await import('@dicebear/styles/toon-head.json')).default;
    default:
      return (await import('@dicebear/styles/avataaars.json')).default;
  }
}

// Constructing a `Style` validates the definition against the library's schema
// and deep-clones it, which is per-definition work rather than per-avatar. The
// customizer re-renders on every click, so the instance is kept.
const styleCache = new Map<string, Style>();

async function styleFor(id: string): Promise<Style> {
  const cached = styleCache.get(id);
  if (cached) return cached;
  const style = new Style(await definitionOf(id));
  styleCache.set(id, style);
  return style;
}

export async function renderAltvatar(
  styleId: string,
  options: AltvatarOptions
): Promise<string> {
  const style = styleOf(styleId);

  // The thing kind leaves the DiceBear path entirely: its art is a bundled
  // picture the route serves, not a generation. This is the display path only
  // — the save path derives the stored data URI through its own server read
  // (openmoji.server.ts), because the filesystem is not reachable here.
  if (style.id === 'openmoji') return openmojiArtUrl(options.selections.glyph);

  const native = toNativeOptions(style, options.selections);
  const svg = new Avatar(await styleFor(style.id), {
    seed: options.seed,
    ...native,
  }).toString();

  // Encoded here rather than through the library's own `toDataUri`, which
  // takes the SVG before the legibility pass has run. The `utf8` parameter is
  // deliberate where the library now writes `charset=utf-8`: art already
  // stored carries this prefix, and nothing gains by splitting the corpus.
  const skin = (native.skinColor as string[] | undefined)?.[0];
  const patched = liftFeatures(svg, style.id, skin);
  return `data:image/svg+xml;utf8,${encodeURIComponent(patched)}`;
}
