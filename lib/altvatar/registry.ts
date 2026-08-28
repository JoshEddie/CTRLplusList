import { avataaarsStyle } from '@/lib/altvatar/styles/avataaars';
import { iconsStyle } from '@/lib/altvatar/styles/icons';
import { personasStyle } from '@/lib/altvatar/styles/personas';
import { toonHeadStyle } from '@/lib/altvatar/styles/toon-head';
import type { AltvatarStyle, AltvatarStyleId } from '@/lib/altvatar/types';
import { ALTVATAR_STYLE_IDS } from '@/lib/altvatar/types';

// Adding a style is a module beside these four plus one line here.
export const ALTVATAR_STYLES: Record<AltvatarStyleId, AltvatarStyle> = {
  avataaars: avataaarsStyle,
  personas: personasStyle,
  'toon-head': toonHeadStyle,
  icons: iconsStyle,
};

export const DEFAULT_STYLE: AltvatarStyleId = 'avataaars';

export function isAltvatarStyleId(value: string): value is AltvatarStyleId {
  return (ALTVATAR_STYLE_IDS as readonly string[]).includes(value);
}

export function styleOf(id: string): AltvatarStyle {
  return ALTVATAR_STYLES[isAltvatarStyleId(id) ? id : DEFAULT_STYLE];
}
