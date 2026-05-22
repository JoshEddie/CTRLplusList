## Resolutions

- **Q2 (create-route shape):** Path **(b) modal**. Inspection confirmed `/items/new` is not a route — clicking the existing CTAs in `ChooseItemsForm` falls through to `[id]/page.tsx`, fails `getItemById('new', ...)`, and redirects to `/items`. The `/items` page itself already uses `ItemFormContainer` as a modal opened from `ItemsPage`. Converting `ChooseItemsForm`'s two CTAs to use the same modal pattern is consistent with the existing UX, simpler than adding a new route, and side-effect-fixes today's broken link without needing `returnTo` plumbing for the create flow. Dead-code `EmptyItem.tsx` will be deleted.
- **Q1 (Cancel button):** `CancelSubmitButtons` currently calls `router.back()` (verified in source) — already returns to caller. No change needed.

## Context

The items workflow has three mutating client-side flows — **create**, **edit**, and **delete** — each of which currently hardcodes `router.push('/items')` (or a `<Link href="/items">`) on completion. Edit and delete share the same parent route (`app/(main)/items/[id]/page.tsx`); create lives at `/items/new`. The form itself is rendered by `ItemForm`, driven by the `useItemForm` hook ([useItemForm.ts:365](<app/(main)/items/ui/components/itemform/useItemForm.ts>)).

The callers that link into these flows are now diverse: the edit link on `Item.tsx` fires from both `/items` (where toolbar state is encoded in URL params — `q`, `sort`, `store`, `purchases`, `price_min`, `price_max`, `page`) and `/lists/[id]` (which also uses URL-param toolbar state per [ItemsBrowser.tsx](<app/(main)/items/ui/components/ItemsBrowser.tsx>)). The "Create new item" link appears from the items page Header, the `EmptyItem` state, and (per the `add-choose-items-toolbar` change) two CTAs inside `ChooseItemsForm`. Every one of these source URLs is meaningful state the user expects to come back to.

The fix needs one mechanism that works for all six post-action navigations (Back, Update success, Cancel from edit; Back, Create success, Cancel from create; plus delete-success). Anything less leaves a hole.

## Goals / Non-Goals

**Goals:**

- After a successful Update, Create, or Delete, the user lands on the same URL (path + search) they came from, with sort / filters / page intact.
- The "Back to Items" button on edit and create pages routes to that same source URL.
- A single, narrow source-of-truth helper enforces same-origin validation of the carried URL; bypassing it is harder than using it.
- Zero changes to server actions, DAL, or routing structure. Additive URL param only.
- Default behavior preserved: when no `returnTo` is present (e.g., a direct deep link to `/items/[id]`), the system falls back to `/items` — exactly today's behavior.

**Non-Goals:**

- Restoring scroll position inside the source page after return.
- Multi-step breadcrumbs / stacked return paths. A single hop is enough; if a user navigates A → B → edit, we return to B, not A.
- Cross-tab / cross-window persistence (sessionStorage, etc).
- Server-side validation of `returnTo`. The client never trusts it; the server doesn't see it.
- Touching the **claim / purchase** flow (separate modal-based action with its own UX).

## Decisions

### Decision 1: `returnTo` as a query param, set by the link source

The source page already knows where it is. The cleanest carrier is a `returnTo` query param appended at link-click time — readable on the destination via `searchParams`, survives reload, easy to debug, easy to log.

**Alternatives considered:**

- **`router.back()`**: brittle — breaks on direct deep-link / refresh / external entry, doesn't restore search params reliably across some browser stacks, and only fixes Back (not post-Save/post-Delete redirect).
- **sessionStorage stash**: invisible state, dies on new tab, recovers nothing after refresh.
- **Referer header**: only available server-side, doesn't survive client-side `router.push`.

`returnTo` is explicit, debuggable, and works identically for every navigation mode.

### Decision 2: Single `sanitizeReturnTo` helper, used everywhere

Open-redirect is the primary risk of any return-to pattern. We mitigate by routing every consumer through one helper:

```
sanitizeReturnTo(value):
  if not a string, or empty → undefined
  if !value.startsWith('/') → undefined            // must be relative
  if value.startsWith('//') → undefined            // protocol-relative is rejected
  if value.includes('://') → undefined             // belt-and-suspenders
  if value.includes('\\') → undefined              // Windows path / escape attempts
  return value
```

Helper returns `undefined` on rejection; callers `?? '/items'` for the default. Never throw — invalid input silently degrades to the safe default.

**Why not URL-encode and re-parse?** Next.js `searchParams` already decodes once. Re-parsing as `new URL(value, 'http://x')` would tempt us to accept absolute URLs that happen to share an origin, which is exactly the foothold we want to avoid. A relative-path-only allowlist is simpler and stricter.

### Decision 3: Source URL is captured client-side via `usePathname` + `useSearchParams`

The link source (`Item.tsx`, `EmptyItem.tsx`, the Header create-link on `/items`, etc) is the only place that knows the full URL state. Server components don't see `searchParams` for the _current_ page when they're rendering a _link_, so this has to happen client-side. `Item.tsx` is already a client component; `EmptyItem` and the items Header may need `'use client'` added (or the link split into a tiny client wrapper) — design.md flags this; tasks.md will resolve.

The serialized form:

```
const here = `${pathname}${searchParams?.toString() ? `?${searchParams}` : ''}`;
const href = `/items/${item.id}?returnTo=${encodeURIComponent(here)}`;
```

We pay one `encodeURIComponent` so the inner `?` and `&` don't collide with the outer query string. The destination page reads `searchParams.get('returnTo')` which auto-decodes once.

### Decision 4: Plumbing — prop, not context

`returnTo` flows from server page → `ItemForm` prop → `useItemForm` argument → `router.push`. Same for `DeleteItemButton` — accept as a prop on the edit page. No React context, no shared store. The plumbing is shallow (two hops max) and keeping it explicit makes the data flow auditable.

`useItemForm`'s signature becomes:

```ts
useItemForm(initialItem?, user_id?, returnTo?: string)
```

Default `returnTo` for the push is `'/items'` — the existing behavior — so flows that don't yet plumb the prop won't regress.

### Decision 5: Sanitize twice — once on read, once at use site? **No: once on read.**

The edit page server component reads `searchParams.returnTo`, sanitizes once, then passes the validated string (or `undefined`) down. The form and the delete button receive an already-trusted value. This keeps the trust boundary at exactly one location.

## Risks / Trade-offs

- **Risk:** A future caller adds a new link to `/items/[id]` and forgets `returnTo`. → **Mitigation:** Fallback to `/items` is the existing behavior; missing `returnTo` is graceful degradation, not a bug. No silent breakage.
- **Risk:** Open redirect via a crafted `returnTo` value (e.g., `//evil.com/foo`). → **Mitigation:** `sanitizeReturnTo` rejects any value that doesn't start with a single `/`, contains `://`, or contains `\`. Tested at the helper level.
- **Risk:** `returnTo` URL gets long for heavily-filtered source pages. → **Trade-off:** acceptable. URL params are already the canonical filter state on `/items`; we're not making them longer, just re-emitting them. Browsers handle multi-kilobyte URLs fine.
- **Risk:** User edits an item, then the source list page no longer contains the edited item (e.g., they filtered to "store: Amazon" and the edit removed Amazon). → **Behavior:** They land on the filtered view, item no longer matches, list shows fewer rows. This is correct — the same thing happens today on any filter; we're just making "return-and-see-the-current-result" the explicit outcome.
- **Trade-off:** `EmptyItem.tsx` and any server-rendered Header that has a "Create new item" link may need to become a client component (or carve out a small client wrapper) so it can read `usePathname` / `useSearchParams`. Minor — both files are tiny.

## Migration Plan

No data migration. Feature-flagless. Ship in one PR:

1. Add `sanitizeReturnTo` helper + unit test (in-file `it.skip(...)` placeholders are acceptable if the project doesn't yet have a test setup for these utilities).
2. Wire all six callers + three consumers in the same change.
3. Smoke-test the matrix in tasks.md §6.

Rollback is `git revert` — no schema, no flag, no data.

## Open Questions

- **Q1:** Should `Cancel` from the edit form (currently part of `CancelSubmitButtons`) also honor `returnTo`? It currently routes... where? Implementation needs to check — if it's already `router.back()` or hardcoded `/items`, decide whether to unify. → Resolution belongs in tasks.md §3.
- **Q2:** Does the "Create new item" page exist at `/items/new/page.tsx`, or under a different route? Tasks.md will confirm via `ls` and adjust file paths. The shape of the change is identical regardless of path.
