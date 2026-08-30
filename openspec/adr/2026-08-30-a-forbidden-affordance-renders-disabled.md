# A forbidden affordance renders disabled

**Touching**: `Role-Gated UI`

**Context**: The profile space shipped a manager view that omits the Settings submit control entirely, on the reasoning that a disabled control offers nothing to act on. In use it reads as a surface with no such feature rather than one the viewer lacks the right to use, and the same question was about to be answered a second time, differently, for the Permissions section on the same page.

**Decision**: A control the viewer's role forbids renders **disabled**, not absent, so the surface communicates that the capability exists and that this viewer does not hold it. The server action remains the enforcement; the disabled control is never relied on.

**Consequences**: Role-gated surfaces look the same to every member, which makes the role legible without a legend, at the cost of rendering controls that can never fire and must each carry an accessible disabled state. It also means a role's powers are inferable from the UI by anyone who can see the surface.
