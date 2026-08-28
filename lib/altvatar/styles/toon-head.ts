import {
  DYE_COLORS,
  GARMENT_COLORS,
  HAIR_COLORS,
  SKIN_TONES,
} from '@/lib/altvatar/palettes';
import type { AltvatarStyle } from '@/lib/altvatar/types';

// toon-head draws hair in two layers — what sits on top and what falls behind
// the head — so it is the one style with a `rearHair` axis, and the two combine
// rather than replacing one another. Its beard lives under `beard` rather than
// `facialHair`, and takes the hair's colour with no option of its own.
export const toonHeadStyle: AltvatarStyle = {
  id: 'toon-head',
  label: 'Toon Head',
  enumAxes: {
    hair: {
      native: 'hair',
      probability: 'hairProbability',
      fallback: 'side-part',
      map: {
        undercut: 'undercut',
        spiky: 'spiky',
        'side-part': 'sideComed',
        bun: 'bun',
      },
    },
    rearHair: {
      native: 'rearHair',
      probability: 'rearHairProbability',
      fallback: 'shoulder-high',
      map: {
        'neck-high': 'neckHigh',
        'shoulder-high': 'shoulderHigh',
        'long-straight': 'longStraight',
        'long-wavy': 'longWavy',
      },
    },
    eyebrows: {
      native: 'eyebrows',
      fallback: 'neutral',
      map: {
        neutral: 'neutral',
        natural: 'happy',
        raised: 'raised',
        angry: 'angry',
        sad: 'sad',
      },
    },
    eyes: {
      native: 'eyes',
      fallback: 'neutral',
      map: {
        neutral: 'happy',
        surprised: 'wide',
        happy: 'bow',
        closed: 'humble',
        wink: 'wink',
      },
    },
    mouth: {
      native: 'mouth',
      fallback: 'smile',
      map: {
        smile: 'smile',
        laughing: 'laugh',
        surprised: 'agape',
        grimace: 'angry',
        sad: 'sad',
      },
    },
    facialHair: {
      native: 'beard',
      probability: 'beardProbability',
      fallback: 'beard-medium',
      map: {
        'beard-medium': 'fullBeard',
        'beard-majestic': 'longBeard',
        goatee: 'chinMoustache',
        'soul-patch': 'chin',
        'moustache-fancy': 'moustacheTwirl',
      },
    },
    clothing: {
      native: 'clothes',
      fallback: 'shirt-crew-neck',
      map: {
        'shirt-crew-neck': 'tShirt',
        'shirt-collared': 'shirt',
        turtleneck: 'turtleNeck',
        dress: 'dress',
        'blazer-and-shirt': 'openJacket',
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
    clothingColor: {
      native: ['clothesColor'],
      fallback: '3c4f5c',
      palette: GARMENT_COLORS,
    },
  },
};
