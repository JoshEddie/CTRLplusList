## 1. Portal the shared Modal

- [ ] 1.1 Convert `app/(main)/items/ui/components/purchasemodal/Modal.tsx` to a client component that renders `null` until a `useEffect`-set `mounted` flag is true, then returns `createPortal(<overlay>, document.body)` — same guard pattern as `ImageSearch.tsx`; props API unchanged.
- [ ] 1.2 Verify both consumers (`PurchaseModalSlot`, `ShareButton`) compile and behave unchanged — no caller edits expected.

## 2. Tests

- [ ] 2.1 Add/extend unit tests per the delta spec scenarios: overlay's parent is `document.body` after mount; `onClose` fires through the close button via the portal. (TESTING.md bar — assert behavior, no snapshot-only or execute-for-coverage tests.)
- [ ] 2.2 Run targeted suites for `PurchaseModalSlot`, `Item`, and `ShareButton`; fix any `container`-scoped queries broken by the portal (`screen.*` queries should be unaffected; `ShareButton.test.tsx` mocks `Modal`).

## 3. Pre-merge

- [ ] 3.1 `npm run lint` — zero errors, zero warnings
- [ ] 3.2 `npx tsc --noEmit` — zero errors
- [ ] 3.3 `npm run build` — completes successfully
- [ ] 3.4 `npm run test:coverage` — zero failing tests
- [ ] 3.5 `npm run test:e2e` — zero failing tests
- [ ] 3.6 Post-deploy: on-device check on iOS (PWA or iOS browser) that the claim modal paints above hero/toolbar/pagination — local preview cannot reproduce issue #148.
