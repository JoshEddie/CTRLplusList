import { getList } from '@/lib/data/list';
import { getMessage } from '@/lib/i18n/utils';
import { OG_SIZE, ogFonts } from '@/lib/og/assets';
import BrandCard from '@/lib/og/BrandCard';
import { cardArtSrc } from '@/lib/og/cardArt';
import ListCard from '@/lib/og/ListCard';
import { ImageResponse } from 'next/og';

export const alt = getMessage('og_list_alt');
export const size = OG_SIZE;
export const contentType = 'image/png';

export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const list = await getList(id);
  const card = list ? (
    <ListCard
      ownerName={list.profile.name}
      accent={list.profile.accent}
      art={await cardArtSrc(list.profile.art)}
      listName={list.name}
    />
  ) : (
    <BrandCard />
  );
  return new ImageResponse(card, { ...OG_SIZE, fonts: ogFonts });
}
