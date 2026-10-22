import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { ALTVATAR_URI_PREFIX } from '@/lib/altvatar/render';
import { openmojiCodeOf } from '@/lib/altvatar/styles/openmoji';
import { PLACEHOLDER_URI_PREFIX } from '@/lib/placeholderArt.shared';

const base64Svg = (svg: string) =>
  PLACEHOLDER_URI_PREFIX + Buffer.from(svg, 'utf8').toString('base64');

// The card renderer rejects the stored `utf8` data-URI and cannot fetch a
// relative path, so both stored forms become base64 here.
export async function cardArtSrc(art: string | null): Promise<string | null> {
  if (art?.startsWith(ALTVATAR_URI_PREFIX)) {
    return base64Svg(decodeURIComponent(art.slice(ALTVATAR_URI_PREFIX.length)));
  }
  const code = art && openmojiCodeOf(art);
  if (!code) return null;
  const file = join(process.cwd(), 'public/openmoji', `${code}.svg`);
  return base64Svg(await readFile(file, 'utf8'));
}
