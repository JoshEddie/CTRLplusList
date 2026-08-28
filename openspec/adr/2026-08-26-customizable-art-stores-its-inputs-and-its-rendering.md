# Customizable art stores its inputs and its rendering

**Touching**: `Generated Art`; `DB Schema`

**Context**: A generated avatar is cheap to render once but is read on every authenticated request, and its inputs have to survive so the editor reopens on what the user actually chose rather than on a guess reverse-engineered from the art.

**Decision**: User-customizable generated art persists both its inputs and its rendering. The rendering is derived server-side from the submitted inputs on every save and is never accepted from a client — a client-supplied rendering is arbitrary content displayed to other people. Reads take the stored rendering; only the editor reads the inputs.

**Consequences**: Rendering becomes a string read rather than a generation, and stored art is stable — upgrading the generator library does not silently redraw everyone's face. The cost is that a deliberate re-render across the corpus needs a migration rather than a deploy.
