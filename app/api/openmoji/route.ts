import { searchOpenmoji } from '@/lib/altvatar/openmoji.catalog';
import { type NextRequest, NextResponse } from 'next/server';

// Search over the bundled OpenMoji catalog for the customizer's thing surface.
// No session check: the catalog is public art metadata, on the same footing as
// the static assets it describes.
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get('q') ?? '';
  const limit = Number(request.nextUrl.searchParams.get('limit')) || 60;
  const offset = Number(request.nextUrl.searchParams.get('offset')) || 0;
  return NextResponse.json(
    searchOpenmoji(
      q.slice(0, 100),
      Math.min(Math.max(limit, 1), 200),
      Math.max(offset, 0)
    )
  );
}
