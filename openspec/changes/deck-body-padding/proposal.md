## Why

Three of the item-form's root screens — Triage, the Focus editor behind it, and the Stores/Lists sheet — render flush to the modal edges. Padding in `deck.css` is authored once per screen, so a new screen is unpadded by default and silently ships that way; these three did, and #214 surfaced the first of them.

Inherited constraints found by grepping active specs:

- `form-shell-system` pins the shell's DOM exactly: the `<FormShell>` inner div renders `form-shell-hd` (title + close) and then "the children prop SHALL render as the inner div's content after the header". There is no body wrapper to hang padding on, and introducing one would modify a second capability's spec — so screen padding stays the screen's own concern.
- `item-decision-deck`'s Purpose already owns "the Triage and Focus editors and sheets behind it, and the Preview", which is the exact set of screens at issue.
- The cross-cutting design-system rule forbids page-scoped one-off classes on *interactive surfaces*. `.deck-body` is not one: it is a layout region inside a capability that already owns its screens, and it introduces no control styling.
- `product-fetch-mock` exists for precisely this defect class — its Purpose names "missing padding" as what unit tests and functional e2e never flag — and gives every deck state a `https://mock.test/<scenario>` URL for visual inspection.

## What Changes

- Add `.deck-body { padding: 8px 24px 24px; }` to `deck.css` as the single home for root-screen padding.
- Apply `deck-body` to all six root elements: `.deck` (Deck, UrlEntryStep), `.deck-triage`, `.deck-focus`, `.deck-sheet`, `.deck-failure`. Fixes the three unpadded screens.
- Delete the `.deck { padding: … }` rule (padding is its only declaration) and drop the padding declaration from `.deck-failure`, which keeps its `align-items` / `text-align`.
- Leave `.deck-preview` (`18px 24px`, also carries `container-type`) and `.prefill-fetching-step` (`32px 24px 0`, centered spinner) on their deliberate values — neither joins.
- Leave `.deck-card`, `.deck-stores`, `.deck-lists` unpadded — they nest inside a padded root and would double-pad.
- No **BREAKING** changes. No behavior changes, no new dependencies.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `item-decision-deck`: adds a requirement that every root screen carries the shared padding class and that nested surfaces do not, replacing per-screen padding authorship. Makes an omission a spec violation rather than an oversight.

## Impact

- `app/(main)/items/ui/components/itemform/deck/deck.css` — new `.deck-body` rule; `.deck` padding rule removed; `.deck-failure` padding declaration removed.
- `app/(main)/items/ui/components/itemform/deck/Deck.tsx`, `UrlEntryStep.tsx`, `deck/Triage.tsx`, `deck/FocusEditor.tsx`, `deck/FetchFailure.tsx`, `ItemFormContainer.tsx` (the `.deck-sheet` wrapper) — `deck-body` added to the root `className`.
- No server-side reads added or modified, so no cache tags are involved.
- `FormShell` and `form-shell-system` are untouched.
- Visual-only; verified by click-test through `https://mock.test/success` in local mode, not by a new automated test (jsdom loads no CSS, and an e2e computed-padding assertion would pin a magic pixel value against future design retunes).
