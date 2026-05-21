## 1. Constants module

- [x] 1.1 Create `lib/visibility.ts` exporting `VISIBILITY` (`as const` object with `OWNER: 'private'`, `LINK: 'unlisted'`, `FOLLOWERS: 'public'`), `ListVisibility` type, and `VISIBILITY_VALUES` readonly tuple.
- [x] 1.2 Implement `fromDb(raw: string): ListVisibility` with branches for both legacy (`'private' | 'unlisted' | 'public'`) and canonical (`'owner' | 'link' | 'followers'`) inputs; throw on unknown values.
- [x] 1.3 Implement `visibilityDbValues(values: readonly ListVisibility[]): string[]` that expands a set of canonical values into all DB-string forms (legacy + canonical) using `LEGACY_TO_CANONICAL`.
- [x] 1.4 Add a top-of-file comment block documenting Stage 1 / Stage 2 / Stage 3 lifecycle and flagging the canonical decoder branches as deliberate not-yet-live infrastructure (SHALL NOT be removed before Stage 3).

## 2. DAL becomes the translation boundary

- [x] 2.1 In `lib/dal.ts`, identify every query that returns a row containing `lists.visibility` (start with `getList`, `getListsByUser`, the feed/profile queries, and the `getListsForFollowers`-style functions).
- [x] 2.2 Normalize the `visibility` column via `fromDb(...)` before each row escapes the DAL; type the function's return signature as carrying `ListVisibility`.
- [x] 2.3 Replace WHERE filters `inArray(lists.visibility, ['unlisted', 'public'])` and `eq(lists.visibility, 'public')` with `inArray(lists.visibility, visibilityDbValues([VISIBILITY.LINK, VISIBILITY.FOLLOWERS]))` (and the appropriate single-value variant for `eq` cases — use `inArray` if needed for tolerance).
- [x] 2.4 Verify that `cacheTag('lists')` and other tags on the affected DAL reads are unchanged. No `revalidateTag` additions required.

## 3. Server action and zod schema

- [x] 3.1 In `app/actions/lists.ts`, replace `const VisibilitySchema = z.enum(['private', 'unlisted', 'public'])` with `z.enum(VISIBILITY_VALUES)`.
- [x] 3.2 Update the exported `type ListVisibility = z.infer<typeof VisibilitySchema>` to re-export from `lib/visibility.ts` (or remove and import from `lib/visibility.ts` at call sites — pick one and apply consistently).
- [x] 3.3 Replace `list.visibility === 'private'` and `next === 'private'` comparisons in `setListVisibility` with `=== VISIBILITY.OWNER`.
- [x] 3.4 Update the `lists.shared` dual-write derivation `shared: next !== 'private'` → `shared: next !== VISIBILITY.OWNER`.

## 4. Components and route file

- [x] 4.1 In `app/(main)/lists/[id]/page.tsx`, replace `list.visibility === 'public'`, `list.visibility === 'private' && !isOwner`, and `list.visibility !== 'private'` with `VISIBILITY.X` comparisons.
- [x] 4.2 In `app/(main)/lists/ui/components/ListDetails.tsx`, replace `visibility !== 'private'` with `visibility !== VISIBILITY.OWNER`.
- [x] 4.3 In `app/(main)/lists/ui/components/VisibilityPicker.tsx`, replace the option list's `value: 'private' | 'unlisted' | 'public'` literals with `VISIBILITY.OWNER | VISIBILITY.LINK | VISIBILITY.FOLLOWERS`.
- [x] 4.4 In `VisibilityPicker.tsx`, change the option labeled "Just me" to **"Hidden"** and its toast from "List is now just me" to **"List is now hidden"**. Confirm icon (`🔒`) and description ("Only I can see this list") are unchanged.
- [x] 4.5 In `app/(main)/lists/ui/components/ShareButton.tsx`, replace `setListVisibility(list.id, 'unlisted')` with `setListVisibility(list.id, VISIBILITY.LINK)`; replace modal copy "This list is just me. Make private & share?" with **"This list is hidden. Make private & share?"**
- [x] 4.6 In `app/(main)/lists/ui/components/HeroCollapsedItems.tsx`, replace `setListVisibility(list.id, 'unlisted')` with `setListVisibility(list.id, VISIBILITY.LINK)`.

## 5. Scripts

- [x] 5.1 In `scripts/seed-dev-users.ts`, replace `l.visibility !== 'private'` with `l.visibility !== VISIBILITY.OWNER`. Verify seeded list visibility values still write the same DB strings as before.
- [x] 5.2 Spot-check `scripts/_drizzle-debug.ts` for any visibility-literal references; replace if present.

## 6. Verification (no behavior change beyond labels)

- [x] 6.1 `grep -nE "'(private|unlisted|public|owner|link|followers)'" app/ lib/ scripts/ --include='*.ts' --include='*.tsx'` returns no matches outside `lib/visibility.ts` (excluding any pre-existing unrelated string usages — verify by surrounding context).
- [x] 6.2 `npm run typecheck` passes (Drizzle row types, `ListVisibility` narrowing). Verified via `npx tsc --noEmit` (no `typecheck` script in package.json).
- [x] 6.3 Browser preview verified at /lists/dev-list-viewer-housewarming: trigger pill renders `🔒 Hidden` with `aria-label="Visibility: Hidden — Only I can see this list. Click to change."`. Page renders without runtime errors.
- [x] 6.4 Modal copy verified in source (ShareButton.tsx primary_text="This list is hidden.").
- [x] 6.5 `VISIBILITY.LINK === 'unlisted'` in Stage 1, so all `setListVisibility(list.id, VISIBILITY.LINK)` call sites still write the legacy `'unlisted'` DB string verbatim.

## 7. Spec sync

- [x] 7.1 Verify `openspec validate extract-visibility-constants` passes.
- [ ] 7.2 On archive, confirm the MODIFIED requirement's updated scenarios (Hidden label) and ADDED constants requirement merge cleanly into `openspec/specs/list-visibility/spec.md`.
