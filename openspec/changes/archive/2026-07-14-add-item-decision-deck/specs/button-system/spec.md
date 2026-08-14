## ADDED Requirements

### Requirement: Buttons SHALL support an optional width axis orthogonal to variant and size

The `<Button>` and `<LinkButton>` primitives, and the shared `buttonClasses(...)` builder, SHALL accept an optional `width: 'auto' | 'full'` argument, orthogonal to `variant` and `size`. When `width === 'full'`, the builder SHALL append a `full` modifier class and the rendered control SHALL span 100% of its containing block's inline size. When `width` is omitted or `'auto'`, no modifier class is emitted and the control keeps its intrinsic width. The width axis SHALL NOT alter the variant's visual treatment, the `sm`/`md` sizing, or the WCAG 2.5.8 44px touch-target floor.

#### Scenario: Full-width button spans its container

- **WHEN** `<Button variant="primary" width="full">` is rendered inside a block container
- **THEN** `buttonClasses` emits the `full` modifier class and the button's computed inline size fills the container

#### Scenario: Default width is intrinsic

- **WHEN** a `<Button>` or `<LinkButton>` is rendered without a `width` prop (or with `width="auto"`)
- **THEN** no `full` modifier class is emitted and the control retains its intrinsic width

#### Scenario: Width does not affect the touch-target floor

- **WHEN** a default-size `<Button width="full">` is rendered
- **THEN** its computed height remains at least 44 CSS pixels — the width axis is independent of the size floor
