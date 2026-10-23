// Union of the latin and latin-ext unicode-range of @fontsource/crimson-pro and
// @fontsource/roboto-condensed 5.3.0. Any codepoint outside it makes next/og
// fetch a glyph at render time, and an emoji makes the render throw. Format
// characters (\p{Cf}) are in range but are the joiners an emoji leaves behind.
const UNDRAWABLE =
  /[^\s\u0020-\u02CC\u02CE-\u02D7\u02DA\u02DC-\u02FF\u0304\u0308\u0329\u1D00-\u1DBF\u1E00-\u1E9F\u1EF2-\u1EFF\u2000-\u206F\u20A0-\u20C0\u2113\u2122\u2191\u2193\u2212\u2215\u2C60-\u2C7F\uA720-\uA7FF\uFFFD]|\p{Cf}/gu;

export function drawableText(s: string): string {
  return s.normalize('NFC').replace(UNDRAWABLE, '').replace(/\s+/g, ' ').trim();
}
