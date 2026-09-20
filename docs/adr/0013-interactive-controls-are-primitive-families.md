# Interactive controls are built once, not per page

A reusable interactive control is built once as a shared family rather than
hand-rolled per page. A one-off is faster to write; a family makes you design an
API up front. That cost buys one keyboard and ARIA implementation per control
instead of one per call site.

**Consequence:** a control hand-rolled per page duplicates its keyboard and ARIA
handling, so every defect in that handling is duplicated with it and must be
found and fixed once per call site.
