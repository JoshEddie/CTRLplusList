import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const OG_SIZE = { width: 1200, height: 630 };

export const SERIF_FONT = 'Crimson Pro';
export const CONDENSED_FONT = 'Roboto Condensed';

export const BRAND_GRADIENT = 'linear-gradient(120deg,#7324ce,#2264c1)';

const font = async (name: string, data: Promise<Buffer>) => ({
  name,
  data: await data,
  weight: 600 as const,
  style: 'normal' as const,
});

const png = async (data: Promise<Buffer>) =>
  `data:image/png;base64,${(await data).toString('base64')}`;

// Each path is a literal under process.cwd() so Next's file trace ships it;
// a path built from a parameter is invisible to the trace.
// Two subsets sharing a name, weight and style drop the second, so latin-ext
// registers under its own name; the renderer falls back across all fonts.
export const ogFonts = await Promise.all([
  font(
    SERIF_FONT,
    readFile(
      join(process.cwd(), 'lib/og/assets/crimson-pro-latin-600-normal.woff')
    )
  ),
  font(
    `${SERIF_FONT} Ext`,
    readFile(
      join(process.cwd(), 'lib/og/assets/crimson-pro-latin-ext-600-normal.woff')
    )
  ),
  font(
    CONDENSED_FONT,
    readFile(
      join(
        process.cwd(),
        'lib/og/assets/roboto-condensed-latin-600-normal.woff'
      )
    )
  ),
  font(
    `${CONDENSED_FONT} Ext`,
    readFile(
      join(
        process.cwd(),
        'lib/og/assets/roboto-condensed-latin-ext-600-normal.woff'
      )
    )
  ),
]);

export const LOGO_SRC = await png(
  readFile(join(process.cwd(), 'lib/og/assets/logo.png'))
);
export const PLUS_SRC = await png(
  readFile(join(process.cwd(), 'lib/og/assets/plus.png'))
);
