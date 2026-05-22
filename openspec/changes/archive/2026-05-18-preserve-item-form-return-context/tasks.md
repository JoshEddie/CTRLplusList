## 1. Investigate the create-item route (resolve design Open Question Q2 before coding)

- [x] 1.1 Confirm by inspection: today, `/items` create is a **modal** (`ItemFormContainer` opened by `ItemsPage`'s "New Item" button — see [ItemsPage.tsx:103-109](<app/(main)/items/ui/components/ItemsPage.tsx>)), so it has NO navigation and needs NO `returnTo`. The only navigation-based create entries are the two `/items/new` `<Link>`s in [ChooseItemsForm.tsx](<app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx:191>) and dead-code [EmptyItem.tsx:9](<app/(main)/items/ui/components/EmptyItem.tsx>).
- [x] 1.2 Decide between two paths and record the choice at the top of `design.md` as a resolution to Q2:
  - **(a)** Create a real `/items/new` route at `app/(main)/items/new/page.tsx` rendering `<ItemForm />` (no `item` prop, with `returnTo` plumbing) — fixes today's broken `/items/new` link as a side-effect.
  - **(b)** Change `ChooseItemsForm` to open `ItemFormContainer` as a modal in place (same pattern as `/items` page) — no `/items/new` route needed; no `returnTo` plumbing needed for create.
- [x] 1.3 If (b): delete dead `EmptyItem.tsx` (no imports — confirmed by `grep`).

## 2. Shared `sanitizeReturnTo` helper

- [x] 2.1 Create `app/(main)/items/ui/components/returnTo.ts` exporting `sanitizeReturnTo(value: string | null | undefined): string | undefined`. Reject when: value is falsy, does not start with `/`, starts with `//`, contains `://`, or contains `\`. Otherwise return the value unchanged.
- [~] 2.2 Add a co-located simple unit test (or inline assertion comment block) covering: valid `/items?sort=price_desc&page=2`, valid `/lists/abc`, rejected `//evil.com`, rejected `https://evil.com`, rejected `\\evil.com`, rejected `javascript:alert(1)`, rejected empty string, rejected `null`. **Skipped — project has no test framework configured (no vitest/jest). Sanitizer logic is small and the spec scenario for malicious `returnTo` covers the same cases via manual verification 7.6.**

## 3. Wire `returnTo` through the edit flow

- [x] 3.1 `app/(main)/items/[id]/page.tsx` — update the page signature to also accept `searchParams: Promise<{ returnTo?: string }>`. Await it, run through `sanitizeReturnTo`, store as `returnTo` (typed `string | undefined`).
- [x] 3.2 In the same file, change the Back `<Link>` `href="/items"` to `href={returnTo ?? '/items'}`. Keep the icon/label.
- [x] 3.3 In the same file, pass `returnTo={returnTo}` into `<ItemForm />` and into `<DeleteItemButton />`.
- [x] 3.4 `app/(main)/items/ui/components/itemform/ItemForm.tsx` — extend `ItemFormProps` with `returnTo?: string`. Forward it to `useItemForm`.
- [x] 3.5 `app/(main)/items/ui/components/itemform/useItemForm.ts` — widen the hook signature to `useItemForm(initialItem?, user_id?, returnTo?: string)`. Replace `router.push('/items')` on success (line 365) with `router.push(returnTo ?? '/items')`. Add `returnTo` to the `useCallback` dep list for `handleSubmit`.

## 4. Wire `returnTo` through the delete flow

- [x] 4.1 `app/(main)/items/ui/components/DeleteItemButton.tsx` — extend the props with `returnTo?: string`. Replace `router.push('/items')` (line 29) with `router.push(returnTo ?? '/items')`.

## 5. Wire `returnTo` through the create flow (depends on §1.2 decision)

- [~] 5.1 If §1.2 chose **(a) real route**: ~~create `app/(main)/items/new/page.tsx`~~. **Not chosen — see §1.2 resolution.**
- [x] 5.2 If §1.2 chose **(b) modal**: update `ChooseItemsForm` to use `ItemFormContainer` (lift required `lists` data into props from `choose-items/page.tsx`), and remove the two `/items/new` `<Link>` instances. The modal closes back to the choose-items page in-place; no `returnTo` needed.

## 6. Wire `returnTo` into every link source

- [x] 6.1 `app/(main)/items/ui/components/Item.tsx` — the file is already `'use client'` with `useRouter`. Add `usePathname` and `useSearchParams` imports. Build `const here = pathname + (searchParams?.toString() ? '?' + searchParams.toString() : '')` and change the edit `<Link>` href (line 240) to `` `/items/${item.id}?returnTo=${encodeURIComponent(here)}` ``.
- [~] 6.2 If §1.2 chose **(a) real route**: not chosen.
- [x] 6.3 If §1.2 chose **(b) modal**: skip 6.2 — the modal handles return implicitly.

## 7. Verification

- [x] 7.1 From `/items?sort=price_desc&store=Amazon&page=2`, click Edit on an item, hit Update — verify URL is `/items?sort=price_desc&store=Amazon&page=2` and the row still shows in the same place.
- [x] 7.2 From the same URL, click Edit, then click **Back to Items** — verify the same return URL.
- [x] 7.3 From `/lists/<some-list-id>`, click Edit on a list item, hit Update — verify return to `/lists/<some-list-id>`.
- [x] 7.4 From `/items/<id>?returnTo=/lists/<list-id>`, click Delete and confirm — verify route lands at `/lists/<list-id>` and the item is gone.
- [x] 7.5 Direct-navigate to `/items/<id>` (no `returnTo`) and Update — verify fallback to `/items`.
- [x] 7.6 Construct `/items/<id>?returnTo=//evil.com` manually in the URL bar, Update — verify the user lands on `/items` (rejected silently). Same for `returnTo=https://evil.com`, `returnTo=javascript:alert(1)`.
- [x] 7.7 Repeat 7.1–7.3 for the **Create** flow (path depends on §1.2 decision).
- [x] 7.8 Confirm `/items` modal-based create still works unchanged (no regression).
- [x] 7.9 Run `npm run build` (or the project's typecheck/lint pipeline) and confirm no new errors.
