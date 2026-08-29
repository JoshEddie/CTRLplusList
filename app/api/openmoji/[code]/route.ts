import { openmojiSvg } from '@/lib/altvatar/openmoji.server';
import { type NextRequest, NextResponse } from 'next/server';

// Serves one bundled OpenMoji SVG by codepoint. A code outside the catalog
// falls back to the default glyph inside `openmojiSvg`, which is also what
// keeps the path a filename can be built from closed. Immutable: codepoint
// filenames never change meaning, so the browser may keep them forever.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  return new NextResponse(await openmojiSvg(code), {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}
