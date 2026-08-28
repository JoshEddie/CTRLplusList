# Patched library markup is re-verified by rendering

**Touching**: `Generated Art`

**Context**: The drawing library exposes no option for several things this app needs — a feature colour that stays legible on the darkest skin tones, a glyph at full alpha for the disc's CSS mask — so the SVG it returns is patched by matching literal markup. Literal matching fails safe in one direction only: when the library changes what it emits, a rule stops applying rather than misapplying. It is silent either way.

**Decision**: Patching the library's own markup is accepted where no option exists, on the single path that also derives stored art, and every rule lives in one module. In exchange, a library upgrade is not complete until each rule has been re-verified **against rendered art**, not against the library's schema or a green test suite — the tests pin the rules against fixtures, and a fixture updated to match new markup proves nothing about the art.

**Consequences**: Features stay legible and glyphs stay solid without waiting on upstream options. The cost is a standing re-verification step on every upgrade, and it is not optional: the 9.4.3 → 10.7.0 bump silently broke two of three legibility rules, started animating every new item placeholder, and dimmed every glyph to four-tenths alpha — none of which any gate caught.
