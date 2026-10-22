import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import { PLACEHOLDER_URI_PREFIX } from '@/lib/placeholderArt.shared';

const UTF8_PREFIX = 'data:image/svg+xml;utf8,';
const OPENMOJI_ART = /^\/openmoji\/([0-9A-F-]+)\.svg$/;

const base64Svg = (svg: string) =>
  PLACEHOLDER_URI_PREFIX + Buffer.from(svg, 'utf8').toString('base64');

// The card renderer rejects the stored `utf8` data-URI and cannot fetch a
// relative path, so both stored forms become base64 here; the regex keeps a
// crafted value from naming any file outside the OpenMoji folder.
export async function cardArtSrc(art: string | null): Promise<string | null> {
  if (art?.startsWith(UTF8_PREFIX)) {
    return base64Svg(decodeURIComponent(art.slice(UTF8_PREFIX.length)));
  }
  const code = art && OPENMOJI_ART.exec(art)?.[1];
  if (!code) return null;
  const file = join(process.cwd(), 'public/openmoji', `${code}.svg`);
  return base64Svg(await readFile(file, 'utf8'));
}
