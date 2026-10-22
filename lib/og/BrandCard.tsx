/* eslint-disable @next/next/no-img-element -- rendered by next/og to a PNG, not served as HTML */
import { getMessage } from '@/lib/i18n/utils';
import {
  BRAND_GRADIENT,
  LOGO_SRC,
  OG_SIZE,
  PLUS_SRC,
  SERIF_FONT,
} from './assets';

export default function BrandCard() {
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        ...OG_SIZE,
        overflow: 'hidden',
        backgroundImage: BRAND_GRADIENT,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          ...OG_SIZE,
          paddingBottom: 96,
        }}
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
              boxShadow: '0 14px 34px rgba(5,21,93,0.45)',
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
              fontFamily: SERIF_FONT,
              fontWeight: 600,
              fontSize: 56,
              lineHeight: 1.1,
              letterSpacing: '-0.01em',
              color: '#fff',
            }}
          >
            {getMessage('app_description')}
          </div>
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: 42,
          width: OG_SIZE.width,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <img src={LOGO_SRC} alt="" width={199} height={52} />
      </div>
    </div>
  );
}
