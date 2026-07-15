## 1. CSS

- [x] 1.1 Add `.deck-body { padding: 8px 24px 24px; }` to `deck.css`
- [x] 1.2 Delete the `.deck { padding: 8px 24px 24px; }` rule — padding is its only declaration, so the whole rule goes
- [x] 1.3 Remove the `padding` declaration from `.deck-failure`, keeping its `align-items: center` and `text-align: center`
- [x] 1.4 Confirm `.deck-preview` is untouched — retains `18px 24px` and `container-type: inline-size`
- [x] 1.5 Fold the shared flex block onto the new class: swap the `.deck`, `.deck-triage`, `.deck-focus`, `.deck-sheet`, `.deck-failure` members for `.deck-body`, leaving `.deck-card`, `.deck-preview`, `.deck-stores`, `.deck-lists` — the surfaces that do not carry `deck-body` — as the remaining members

## 2. Apply the class to the six roots

- [x] 2.1 `deck/Deck.tsx` — root `className="deck deck-body"`
- [x] 2.2 `UrlEntryStep.tsx` — root `className="deck deck-body"` (the second `.deck` call site; easy to miss)
- [x] 2.3 `deck/Triage.tsx` — root `className="deck-triage deck-body"`
- [x] 2.4 `deck/FocusEditor.tsx` — root `className="deck-focus deck-body"`
- [x] 2.5 `deck/FetchFailure.tsx` — root `className="deck-failure deck-body"`
- [x] 2.6 `ItemFormContainer.tsx` — the sheet wrapper, `className="deck-sheet deck-body"`
- [x] 2.7 Verify no nested surface received the class — `.deck-card`, `.deck-stores`, `.deck-lists` must stay without it or they double-pad

## 3. Pre-merge

- [x] 3.1 `npm run lint` — zero errors, zero non-size warnings
- [x] 3.2 `npx tsc --noEmit` — zero errors
- [x] 3.3 `npm run build` — completes successfully
- [x] 3.4 `npm run test:coverage` — zero failing tests
- [x] 3.5 `npm run test:e2e` — zero failing tests
- [x] 3.6 `openspec validate deck-body-padding --strict` passes

## 4. Verification

- [x] 4.1 Owner click-test in local mode (`npm run dev:local`): paste `https://mock.test/success`, then walk Preview → Triage → tap a row into Focus → open the Stores and Lists sheets, confirming every screen is inset and none is double-padded. CSS-only change — no dev-deployment behavior differs from local, so `/landfall` fast path applies
