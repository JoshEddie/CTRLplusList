# Accessibility is a good-faith target, not a conformance claim

Two areas are held to a standard: **clickable surfaces** and **colour contrast**.
WCAG level A is the floor, AA where it is practical. This is deliberately a
good-faith effort rather than audited conformance — nothing in the repo verifies
a level, so no compliance claim should be made from it.

Three mechanisms back it: contrast is unit-tested, e2e locates by accessible
role rather than test id, and keyboard behaviour is only ever as good as the
primitive family implementing it
([ADR-0013](0013-interactive-controls-are-primitive-families.md)). Anything
outside those three is unenforced.
