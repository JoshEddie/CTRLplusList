# Generated art is baked and persisted, never re-themed at render

Altvatar looks and item placeholders store the rendered art in a text column,
alongside the options that generated it. A look is a `utf8` SVG data-URI, or for
an OpenMoji look the relative `/openmoji/<code>.svg` path of its bundled glyph; a
placeholder is a base64 SVG data-URI. Colours are baked in at generation time
from brand-derived snapshots of the CSS tokens, so saved art is self-contained and **can drift from `global.css` by design**. Rendering from
the stored options on every request would remove the drift but adds generation
cost per render, or pushes the generator into the client bundle.

**Consequence:** a rebrand regenerates rows; it does not re-theme them.

The share-link card's renderer accepts neither stored look form, so the card
re-encodes the look to a base64 data-URI in memory at render time, reading an
OpenMoji glyph from `public/openmoji`. Storage and the writer are unchanged.
