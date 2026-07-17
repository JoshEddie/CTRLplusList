## MODIFIED Requirements

### Requirement: useDismiss SHALL resolve in three branches with onClose preferred over router.back over router.push

The `useDismiss(onClose, closeHref)` hook SHALL be a shared dismiss primitive composed by both `<FormShell>` and the item-add deck-owned shell (`DeckShell`), rather than a hook private to `FormShell.tsx`. Its behavior SHALL be identical for every consumer: it returns a function that, when invoked, resolves dismiss in this priority order:

1. If `onClose` is provided (truthy), invoke `onClose()` and return.
2. Else, if `typeof window !== 'undefined'` AND `window.history.length > 1`, invoke `router.back()` and return.
3. Else, if `closeHref` is provided (truthy), invoke `router.push(closeHref)`.
4. If none of the above conditions fire, the dismiss is a no-op (no error thrown).

The `typeof window !== 'undefined'` guard is required for Next.js SSR safety. The `window.history.length > 1` guard prefers `router.back()` for intercepted-route modals (where the `@modal` parallel slot unmounts on back-navigation); the `closeHref` fallback handles direct-load cases where no history entry exists. Extracting the hook to a shared home SHALL NOT change `<FormShell>`'s rendered structure, variants, or dismiss branches.

#### Scenario: onClose provided wins over router

- **WHEN** the dismiss helper is invoked with `useDismiss(onCloseSpy, '/somewhere')` and `router` is mocked
- **THEN** `onCloseSpy` is called exactly once
- **AND** `router.back` is NOT called
- **AND** `router.push` is NOT called

#### Scenario: No onClose and history available calls router.back

- **WHEN** `window.history.length > 1` AND no `onClose` is provided
- **AND** the dismiss helper is invoked
- **THEN** `router.back` is called exactly once
- **AND** `router.push` is NOT called

#### Scenario: No onClose, no history, closeHref provided calls router.push

- **WHEN** `window.history.length === 1` AND no `onClose` is provided AND `closeHref='/lists'`
- **AND** the dismiss helper is invoked
- **THEN** `router.push` is called exactly once with the argument `'/lists'`
- **AND** `router.back` is NOT called

#### Scenario: No onClose, no history, no closeHref is a no-op

- **WHEN** `window.history.length === 1` AND no `onClose` is provided AND no `closeHref` is provided
- **AND** the dismiss helper is invoked
- **THEN** `router.back` is NOT called
- **AND** `router.push` is NOT called
- **AND** no error is thrown

#### Scenario: Deck shell composes the same dismiss primitive

- **WHEN** the item-add deck-owned shell (`DeckShell`) resolves a dismiss
- **THEN** it SHALL use the same shared `useDismiss` primitive with the same three-branch resolution, not a re-implemented copy
