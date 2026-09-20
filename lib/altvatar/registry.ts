import { avataaarsStyle } from '@/lib/altvatar/styles/avataaars';
import { openmojiStyle } from '@/lib/altvatar/styles/openmoji';
import { personasStyle } from '@/lib/altvatar/styles/personas';
import { toonHeadStyle } from '@/lib/altvatar/styles/toon-head';
import type {
  AltvatarKind,
  AltvatarStyle,
  AltvatarStyleId,
} from '@/lib/altvatar/types';
import { ALTVATAR_STYLE_IDS } from '@/lib/altvatar/types';

// Adding a style is a module beside these four plus one line here.
export const ALTVATAR_STYLES: Record<AltvatarStyleId, AltvatarStyle> = {
  avataaars: avataaarsStyle,
  personas: personasStyle,
  'toon-head': toonHeadStyle,
  openmoji: openmojiStyle,
};

export const DEFAULT_STYLE: AltvatarStyleId = 'avataaars';

export function isAltvatarStyleId(value: string): value is AltvatarStyleId {
  return (ALTVATAR_STYLE_IDS as readonly string[]).includes(value);
}

export function styleOf(id: string): AltvatarStyle {
  return ALTVATAR_STYLES[isAltvatarStyleId(id) ? id : DEFAULT_STYLE];
}

export function kindOf(styleId: string): AltvatarKind {
  return styleOf(styleId).id === 'openmoji' ? 'thing' : 'person';
}

// The person kind's style picker draws from these; the thing kind has one
// style and no picker.
export const PERSON_STYLE_IDS = ALTVATAR_STYLE_IDS.filter(
  (id) => kindOf(id) === 'person'
);
