import { getList } from '@/lib/data/list';
import { OG_SIZE, ogFonts } from '@/lib/og/assets';
import { cardArtSrc } from '@/lib/og/cardArt';
import ListCard from '@/lib/og/ListCard';
import { ImageResponse } from 'next/og';

// ponytail: throwaway gallery for spec #439, deleted before dev goes to a release branch.
export async function GET(req: Request) {
  if (process.env.VERCEL_ENV === 'production') {
    return new Response(null, { status: 404 });
  }
  const q = new URL(req.url).searchParams;
  const artOf = q.get('artOf');
  const art = artOf
    ? ((await getList(artOf))?.profile.art ?? null)
    : q.get('art');
  return new ImageResponse(
    <ListCard
      ownerName={q.get('owner') ?? ''}
      accent={q.get('accent')}
      art={await cardArtSrc(art)}
      listName={q.get('list') ?? ''}
    />,
    { ...OG_SIZE, fonts: ogFonts }
  );
}
