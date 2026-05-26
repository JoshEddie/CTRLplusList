## Why

Today, when a user clicks "Edit" on an item from `/items` (with sort / filter / page applied) or from `/lists/[id]`, the edit page's **Back** button and the form's **Update** (Save) action both unconditionally route to bare `/items`. The same is true after **Delete** and after **Create**. Any toolbar state the user had — sort, store filter, price filter, search, page — is discarded, and users coming from a list lose their place entirely. This makes the items workflow feel hostile precisely when a user is doing focused editing across a filtered set.

## What Changes

- Add a `returnTo` URL parameter to every entry point into the item form pages (`/items/[id]` for edit, `/items/new` for create), carrying the source URL (path + search) so the form can route back to it.
- Update the Item card's edit link (`Item.tsx`) to compute `returnTo` from the current `pathname` + `searchParams`.
- Update every "Create new item" link (items page Header, `EmptyItem`, `ChooseItemsForm`'s two CTAs) to attach `returnTo` from the current URL.
- On `/items/[id]` (edit page): make the **Back** button link to the validated `returnTo` (fallback `/items`), and have the form's **Update** success path `router.push(returnTo)` instead of the hardcoded `/items`.
- On the create-item page (`/items/new`): same treatment — form's **Create** success path goes to `returnTo`, with cancel/back honoring it too.
- On `DeleteItemButton`: after successful delete, `router.push(returnTo)` instead of the hardcoded `/items`. The deleted item will simply not appear when the destination list re-renders.
- Introduce a single shared helper `sanitizeReturnTo(value)` that accepts only same-origin relative paths (must start with `/` but not `//` and not contain `://`). All consumers route through it. This is the open-redirect guard.

Two-axis sort, restoring scroll position on return, and any kind of cross-tab persistence are **out of scope**.

## Capabilities

### New Capabilities

(None — this change extends an existing capability.)

### Modified Capabilities

- `list-item-management`: Adds a requirement that the item edit, create, and delete flows preserve the caller's navigation context (path + search params) via a `returnTo` URL parameter, so users return to the same filtered/sorted/paginated view they came from.

## Impact

- **Code**
  - `app/(main)/items/ui/components/Item.tsx` — make the edit `<Link>` href dynamic; append `?returnTo=...` from `usePathname()` + `useSearchParams()`.
  - `app/(main)/items/[id]/page.tsx` — read `returnTo` from `searchParams`, sanitize it, pass to `ItemForm` and to `<Link>` Back href; default to `/items` when absent or invalid.
  - `app/(main)/items/ui/components/itemform/ItemForm.tsx` — accept a `returnTo?: string` prop and forward to `useItemForm`.
  - `app/(main)/items/ui/components/itemform/useItemForm.ts` — accept `returnTo?: string`; `router.push(returnTo ?? '/items')` on create-or-update success.
  - `app/(main)/items/ui/components/DeleteItemButton.tsx` — accept a `returnTo?: string` prop; use it in the post-delete `router.push`.
  - `app/(main)/items/new/page.tsx` (or wherever the create route lives) — same `returnTo` plumbing as the edit page.
  - `app/(main)/items/ui/components/EmptyItem.tsx` — append `returnTo` to the `/items/new` link.
  - `app/(main)/lists/[id]/choose-items/ChooseItemsForm.tsx` — append `returnTo` to its two `/items/new` links.
  - New helper `app/(main)/items/ui/components/returnTo.ts` exporting `sanitizeReturnTo(value: string | null | undefined): string | undefined`.
- **No DB or DAL changes.**
- **No server actions touched.** `createItem` / `updateItem` / `deleteItem` continue to be called as today; only the post-success client-side navigation changes.
- **No breaking changes** to existing URLs or routes. `returnTo` is additive — absence preserves today's behavior (always land on `/items`).
- **Security:** the sanitizer is the only point of trust. Anything that fails validation is silently dropped to the default — never thrown or rendered.
