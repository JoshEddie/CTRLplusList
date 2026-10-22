import { getMessage } from '@/lib/i18n/utils';
import { OG_SIZE, ogFonts } from '@/lib/og/assets';
import BrandCard from '@/lib/og/BrandCard';
import { ImageResponse } from 'next/og';

export const alt = `${getMessage('app_name')}: ${getMessage('app_description')}`;
export const size = OG_SIZE;
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(<BrandCard />, { ...OG_SIZE, fonts: ogFonts });
}
