import type { ReactNode } from 'react';

import { OG_SIZE } from './assets';

// The renderer has no z-index, so the logo strip is the root's last child.
export default function OgFrame({
  background,
  paddingBottom,
  logoBottom,
  logo,
  children,
}: {
  background: string;
  paddingBottom: number;
  logoBottom: number;
  logo: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: 'flex',
        position: 'relative',
        ...OG_SIZE,
        overflow: 'hidden',
        backgroundImage: background,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          ...OG_SIZE,
          paddingBottom,
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 0,
          bottom: logoBottom,
          width: OG_SIZE.width,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {logo}
      </div>
    </div>
  );
}
