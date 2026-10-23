/* eslint-disable @next/next/no-img-element -- rendered by next/og to a PNG, not served as HTML */
import { getMessage } from '@/lib/i18n/utils';
import {
  BRAND_GRADIENT,
  LOGO_SRC,
  OG_COLORS,
  PLUS_SRC,
  SERIF_TEXT,
} from './assets';
import OgFrame from './OgFrame';

export default function BrandCard() {
  return (
    <OgFrame
      background={BRAND_GRADIENT}
      paddingBottom={96}
      logoBottom={42}
      logo={<img src={LOGO_SRC} alt="" width={199} height={52} />}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          width: 630,
          padding: '196px 8px 0',
        }}
      >
        <div
          style={{
            position: 'absolute',
            display: 'flex',
            top: 0,
            left: 231,
            width: 168,
            height: 168,
            borderRadius: 38,
            overflow: 'hidden',
            boxShadow: `0 14px 34px ${OG_COLORS.secondaryDark}73`,
          }}
        >
          <img src={PLUS_SRC} alt="" width={168} height={168} />
        </div>
        <div
          style={{
            display: 'block',
            lineClamp: 3,
            width: 614,
            textAlign: 'center',
            ...SERIF_TEXT,
            fontSize: 56,
            color: OG_COLORS.light,
          }}
        >
          {getMessage('app_description')}
        </div>
      </div>
    </OgFrame>
  );
}
