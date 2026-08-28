import { GLYPHS } from '@/lib/altvatar/styles/icons.glyphs';
import type { AltvatarStyle } from '@/lib/altvatar/types';

// The whole of this style is which glyph to draw — no parts, no probabilities,
// and no colour of its own: the glyph generates as flat alpha and the avatar
// disc paints it from the accent's ink through a CSS mask.
export const iconsStyle: AltvatarStyle = {
  id: 'icons',
  label: 'Icons',
  enumAxes: {
    glyph: {
      native: 'icon',
      fallback: 'star',
      map: Object.fromEntries(GLYPHS.map((g) => [g.value, g.native])),
    },
  },
  colorAxes: {},
  glyph: true,
};
