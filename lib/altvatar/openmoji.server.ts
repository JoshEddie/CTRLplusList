import { safeOpenmojiCode } from '@/lib/altvatar/openmoji.catalog';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Read relative to the working directory rather than resolved through the
// module graph: output file tracing copies `node_modules/openmoji/color/svg`
// into the function bundle at this same relative path (see
// `outputFileTracingIncludes` in next.config.ts), and a bundler-resolved path
// would point inside the compiled chunk instead.
const SVG_DIR = path.join(process.cwd(), 'node_modules/openmoji/color/svg');

export async function openmojiSvg(code: string | undefined): Promise<string> {
  return readFile(path.join(SVG_DIR, `${safeOpenmojiCode(code)}.svg`), 'utf8');
}

// The same data-URI prefix every generated style stores, so the art corpus
// stays one shape whatever drew it.
export async function openmojiDataUri(
  code: string | undefined
): Promise<string> {
  return `data:image/svg+xml;utf8,${encodeURIComponent(await openmojiSvg(code))}`;
}
