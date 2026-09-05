# Generated art is baked and persisted, never re-themed at render

Altvatar looks and item placeholders store the rendered SVG as a base64 data-URI
in a text column, alongside the options that generated it. Colours are baked in
at generation time from brand-derived snapshots of the CSS tokens, so saved art
is self-contained and **can drift from `global.css` by design**. Rendering from
the stored options on every request would remove the drift but adds generation
cost per render, or pushes the generator into the client bundle.

**Consequence:** a rebrand regenerates rows; it does not re-theme them.
