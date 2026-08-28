# Generated art speaks our own option vocabulary

**Touching**: `Generated Art`

**Context**: DiceBear's 9.x styles name the same part differently — `top` is hair in `avataaars` and an antenna in `bottts`, `personas` files headwear inside its own `hair` axis, and `toon-head` splits hair into `hair` and `rearHair` — and some styles name their values in a way no viewer can read at all, as `adventurer`'s `variant01`–`variant45` did. An earlier reading concluded no translation layer was viable; it was comparing the libraries' names against each other rather than against a vocabulary of our own.

**Decision**: Generated-art options are named in an app-owned vocabulary — both the axis (`hair`) and the value (`short-curly`) — and a per-style table maps each canonical value to that style's native option. Storage holds the canonical value; the library's own names reach neither storage nor a user. The vocabulary is a closed whitelist: an option with no canonical name is not offered, so a library release adds nothing until it is named. The table may be incomplete — a canonical value a style carries no row for is simply not offered while that style is selected — because whether two styles draw the same canonical thing is a judgement someone makes by looking at the art.

**Consequences**: Adding a style becomes a data change (name its values, map them) rather than a redesign, and any value two styles share survives a style switch untouched. The cost is a mapping no code can generate, which a human must extend for every style added.
