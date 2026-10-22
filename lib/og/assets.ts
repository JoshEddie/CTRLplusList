import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

export const OG_SIZE = { width: 1200, height: 630 };

// Snapshots of global.css tokens, since a rendered PNG cannot read a custom
// property: a rebrand updates these alongside the stylesheet.
export const OG_COLORS = {
  primary: '#7324ce', // --primary-color
  secondary: '#2264c1', // --secondary-color
  secondaryDark: '#05155d', // --secondary-color-dark
  cardBorder: '#ebebf5', // --card-border-color
};

export const BRAND_GRADIENT = `linear-gradient(120deg, ${OG_COLORS.primary}, ${OG_COLORS.secondary})`;

const SERIF_FONT = 'Crimson Pro';
const CONDENSED_FONT = 'Roboto Condensed';

// Two subsets sharing a name, weight and style drop the second, so latin-ext
// registers under its own name. A glyph missing from every font a style names
// falls back in registration order, so each style names both of its subsets.
export const SERIF_TEXT = {
  fontFamily: `${SERIF_FONT}, ${SERIF_FONT} Ext`,
  fontWeight: 600,
  lineHeight: 1.1,
  letterSpacing: '-0.01em',
};
export const CONDENSED_TEXT = {
  fontFamily: `${CONDENSED_FONT}, ${CONDENSED_FONT} Ext`,
  fontWeight: 600,
};

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
