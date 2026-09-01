# Passive surfaces protect, operated surfaces expose

**Touching**: `openspec/specs/spoiler-visibility/spec.md`

**Context**: Spoiler visibility reads as an access-control problem, and treating it as one turns every channel into a leak to be closed — a filter that narrows to claimed items, an action label that names claim state, a modal that lists claims. But the protected viewer is the same person operating those controls, and they can always reveal to themselves.

**Decision**: Spoiler protection guards against being spoiled **by accident**, not against a viewer who chooses to look. Passive surfaces — anything that renders without being asked for — respect the resolved state; anything the viewer deliberately operates may expose, and is owed no gate. An action-row label that states claim state is passive and governed even though it sits on a control, because the viewer did not ask for it by reading it.

**Consequences**: The purchase modal and the per-list spoiler control need no gating, and any future claim surface is classified by whether the viewer asked for it. A viewer can spoil themselves in a single deliberate act, which is intended behaviour rather than a defect.
