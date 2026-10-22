/* eslint-disable @next/next/no-img-element -- rendered by next/og to a PNG, not served as HTML */
import { initialsOf } from '@/app/ui/components/utils';
import { accentGradient, accentPreset } from '@/lib/accent';
import { getMessage } from '@/lib/i18n/utils';
import {
  BRAND_GRADIENT,
  CONDENSED_TEXT,
  LOGO_SRC,
  OG_COLORS,
  PLUS_SRC,
  SERIF_TEXT,
} from './assets';
import OgFrame from './OgFrame';
import { drawableText } from './utils';

const DISC = 148;
const DISC_BORDER = 8;
const ART_SIZE = DISC - 2 * DISC_BORDER;
const PLATE_WIDTH = 800;
const TEXT_WIDTH = 614;

// Steps are by character count, as drawn on the design's stress-test card.
function actionLineType(line: string) {
  if (line.length <= 28) return { fontSize: 40, lineClamp: 1 };
  if (line.length <= 36) return { fontSize: 34, lineClamp: 1 };
  return { fontSize: 30, lineClamp: 2 };
}

function listNameType(name: string) {
  if (name.length <= 10) return { fontSize: 112, lineClamp: 1 };
  if (name.length <= 20) return { fontSize: 88, lineClamp: 2 };
  if (name.length <= 32) return { fontSize: 72, lineClamp: 2 };
  if (name.length <= 40) return { fontSize: 60, lineClamp: 2 };
  return { fontSize: 50, lineClamp: 2 };
}

const logoPill = (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      padding: '10px 24px',
      borderRadius: 999,
      backgroundImage: BRAND_GRADIENT,
      border: '2px solid rgba(255,255,255,0.85)',
      boxShadow: `0 6px 18px ${OG_COLORS.secondaryDark}59`,
    }}
  >
    <img src={LOGO_SRC} alt="" width={160} height={42} />
  </div>
);

// The renderer has no z-index, so the disc overlapping the plate's top edge is
// the plate's first child.
export default function ListCard({
  ownerName,
  accent,
  art,
  listName,
}: {
  ownerName: string;
  accent: string | null;
  art: string | null;
  listName: string;
}) {
  const { light, dark, ink } = accentPreset(accent);
  const owner = drawableText(ownerName);
  const name = drawableText(listName);
  const initials = initialsOf(owner);
  const discArt = art ?? (initials ? null : PLUS_SRC);
  const actionLine = owner
    ? getMessage('list_card_shared_by', { name: owner })
    : getMessage('list_card_shared_anonymous');

  return (
    <OgFrame
      background={accentGradient({ light, dark })}
      paddingBottom={116}
      logoBottom={34}
      logo={logoPill}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          width: PLATE_WIDTH,
          padding: '106px 93px 46px',
          marginTop: 74,
          background: '#fff',
          borderRadius: 44,
          border: `1px solid ${OG_COLORS.cardBorder}`,
          boxShadow: `0 26px 64px ${dark}80`,
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            top: -75,
            left: (PLATE_WIDTH - DISC) / 2,
            width: DISC,
            height: DISC,
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              background: light,
              border: `${DISC_BORDER}px solid rgba(255,255,255,0.95)`,
              boxSizing: 'border-box',
              overflow: 'hidden',
              boxShadow: `0 14px 34px ${dark}80`,
              color: ink,
              ...CONDENSED_TEXT,
              fontSize: ART_SIZE * 0.4,
              lineHeight: 1,
              letterSpacing: 0.5,
            }}
          >
            {discArt ? (
              <img
                src={discArt}
                alt=""
                width={ART_SIZE}
                height={ART_SIZE}
                data-testid="list-card-art"
              />
            ) : (
              initials
            )}
          </div>
        </div>
        <div
          style={{
            display: 'block',
            ...actionLineType(actionLine),
            maxWidth: TEXT_WIDTH,
            marginBottom: 14,
            textAlign: 'center',
            ...CONDENSED_TEXT,
            lineHeight: 1.1,
            color: ink,
          }}
        >
          {actionLine}
        </div>
        {name && (
          <div
            data-testid="list-card-name"
            style={{
              display: 'block',
              ...listNameType(name),
              maxWidth: TEXT_WIDTH,
              textAlign: 'center',
              ...SERIF_TEXT,
              color: ink,
            }}
          >
            {name}
          </div>
        )}
      </div>
    </OgFrame>
  );
}
