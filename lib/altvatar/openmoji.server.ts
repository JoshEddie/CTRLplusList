import { safeOpenmojiCode } from '@/lib/altvatar/openmoji.catalog';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// The same art the browser gets from `/openmoji/<code>.svg`, read off disk for
// the save path — which needs the bytes inlined, not a URL.
const SVG_DIR = path.join(process.cwd(), 'public/openmoji');

// The same data-URI prefix every generated style stores, so the art corpus
// stays one shape whatever drew it.
export async function openmojiDataUri(
  code: string | undefined
): Promise<string> {
  const svg = await readFile(
    path.join(SVG_DIR, `${safeOpenmojiCode(code)}.svg`),
    'utf8'
  );
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
