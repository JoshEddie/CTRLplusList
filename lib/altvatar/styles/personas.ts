import {
  DYE_COLORS,
  GARMENT_COLORS,
  HAIR_COLORS,
  SKIN_TONES,
} from '@/lib/altvatar/palettes';
import type { AltvatarStyle } from '@/lib/altvatar/types';
import { NONE } from '@/lib/altvatar/types';

// personas puts three things inside axes that do not name them: a cap and a
// beanie live in `hair`, and both pairs of glasses live in `eyes`. Both are
// overlays here, so headwear and eyewear read as their own choices and picking
// neither leaves the hair and the eyes underneath showing.
//
// Its hair carries no probability toggle — `bald` is a hair value rather than
// the absence of one — so this style offers `bald` where the others offer
// `None`, which is what the art actually draws.
export const personasStyle: AltvatarStyle = {
  id: 'personas',
  label: 'Personas',
  enumAxes: {
    hair: {
      native: 'hair',
      fallback: 'bob',
      map: {
        bald: 'bald',
        balding: 'balding',
        buzzcut: 'buzzcut',
        fade: 'fade',
        mohawk: 'mohawk',
        'side-part': 'shortCombover',
        'side-part-chops': 'shortComboverChops',
        'shaved-sides': 'sideShave',
        curly: 'curly',
        'curly-high-top': 'curlyHighTop',
        bob: 'bobCut',
        'bob-bangs': 'bobBangs',
        pigtails: 'pigtails',
        bun: 'straightBun',
        'curly-bun': 'curlyBun',
        'bun-undercut': 'bunUndercut',
        'long-mid': 'long',
        'extra-long': 'extraLong',
      },
    },
    hat: {
      native: 'hair',
      overlay: true,
      fallback: 'hat',
      map: { hat: 'cap', 'winter-hat-4': 'beanie' },
    },
    eyes: {
      native: 'eyes',
      fallback: 'neutral',
      map: {
        neutral: 'open',
        closed: 'sleep',
        happy: 'happy',
        wink: 'wink',
      },
    },
    glasses: {
      native: 'eyes',
      overlay: true,
      fallback: 'prescription-1',
      map: { 'prescription-1': 'glasses', sunglasses: 'sunglasses' },
    },
    nose: {
      native: 'nose',
      fallback: 'medium-round',
      map: {
        'medium-round': 'mediumRound',
        'small-round': 'smallRound',
        wrinkles: 'wrinkles',
      },
    },
    mouth: {
      native: 'mouth',
      fallback: 'smile',
      map: {
        smile: 'smile',
        smirk: 'smirk',
        laughing: 'bigSmile',
        lips: 'lips',
        pacifier: 'pacifier',
      },
    },
    facialHair: {
      native: 'facialHair',
      probability: 'facialHairProbability',
      fallback: 'goatee',
      map: {
        'beard-light': 'shadow',
        'beard-majestic': 'beardMustache',
        'beard-pyramid': 'pyramid',
        goatee: 'goatee',
        'soul-patch': 'soulPatch',
        'moustache-magnum': 'walrus',
      },
    },
    body: {
      native: 'clothes',
      fallback: 'rounded',
      map: {
        squared: 'squared',
        rounded: 'rounded',
        small: 'small',
        checkered: 'checkered',
      },
    },
  },
  colorAxes: {
    skinColor: {
      native: ['skinColor'],
      fallback: 'edb98a',
      palette: SKIN_TONES,
    },
    hairColor: {
      native: ['hairColor'],
      fallback: '2c1b18',
      palette: [...HAIR_COLORS, ...DYE_COLORS],
    },
    facialHairColor: {
      native: ['facialHairColor'],
      fallback: '2c1b18',
      // Follows the hair until someone picks otherwise, and is not offered at
      // all on a clean-shaven face.
      inheritsFrom: 'hairColor',
      visibleWhen: { axis: 'facialHair', value: NONE, negate: true },
      palette: [...HAIR_COLORS, ...DYE_COLORS],
    },
    clothingColor: {
      native: ['clothingColor'],
      fallback: '3c4f5c',
      palette: GARMENT_COLORS,
    },
  },
};
