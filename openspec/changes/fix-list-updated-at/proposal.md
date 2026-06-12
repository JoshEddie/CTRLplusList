## Why

The list hero footer renders "N items · updated T ago" (`list-hero-header` spec, Requirement: footer line), but `lists.updated_at` is set only by `defaultNow()` at insert — no write path ever touches it afterward. The label is really "created T ago": detail edits, item adds, and item removals all leave it frozen ([issue #140](https://github.com/JoshEddie/CTRLplusList/issues/140)). For followers deciding whether a list has news, the timestamp lies.

Inherited constraints found in active specs:

- `list-hero-header` SHALL render the footer "N items · updated T ago" — display contract unchanged; this change fixes the value feeding it.
- `list-metadata` governs detail-update behavior (partial payloads, subtitle semantics) — the no-op-skip behavior added here modifies its update requirement.
- `list-item-management` governs membership writes (`setListItems`, reorder midpoint math) — membership changes gain a side effect on `lists.updated_at`; reorder explicitly does not.

## What Changes

- `lists.updated_at` is bumped when, and only when, a change a follower would plausibly be notified about occurs ("notification razor"):
  - List detail edit (name, subtitle, occasion, date) that actually changes a value.
  - Item added to or removed from the list — via the list page (`setListItems`), the item form (`updateItemLists`), or item deletion (cascade removal from its lists).
- Explicitly excluded from bumping: reorder (`updatePriority`), item field edits (`updateItem`), item archive/unarchive, visibility changes (owned by `shared_at`), claims/purchases (spoiler hazard: owners must not infer claim activity from the timestamp).
- `updateList` gains a dirty check: when the validated payload matches the stored row, no `UPDATE` is issued at all (and therefore no timestamp bump); the action returns success.
- The list edit form skips the server call entirely when nothing changed (client-side pristine check) — UX layer; the server-side dirty check remains the integrity authority.
- No schema change, no migration, no backfill: existing rows where `updated_at = created_at` honestly mean "unchanged since creation".

## Capabilities

### New Capabilities

- `list-update-recency`: when `lists.updated_at` SHALL and SHALL NOT advance — the bump-trigger matrix across detail edits, membership changes, reorders, item edits, archive, visibility, and claims, plus the no-op dirty-check contract.

### Modified Capabilities

- `list-metadata`: the detail-update requirement gains a no-op guard — an update payload whose values all match the stored row SHALL issue no write and SHALL still return success.
- `list-item-management`: membership mutations (add/remove) gain the side effect of advancing the owning list's `updated_at`; reorder SHALL NOT advance it.

## Impact

- `lib/data/list.actions.ts` — `updateList`: widen the existing ownership-check fetch to include detail columns, add dirty comparison (value equality for `date`), include `updated_at` in the write.
- `lib/data/listItems.actions.ts` — `setListItems`: bump on actual add/remove (existing "No changes" early return already guards no-ops); `updatePriority` untouched.
- `lib/data/item.associations.ts` — `updateItemLists`: bump only lists actually gaining or losing the item.
- `lib/data/item.actions.ts` — `deleteItem`: capture the item's list memberships before delete and bump those lists.
- A small shared `touchLists(listIds)` helper in `lib/data` (one `UPDATE … WHERE id IN (...)`).
- List edit form component — client-side pristine check before submit.
- Cache tags: all touched mutations already call `updateTag('lists')` except `updateItemLists`/`deleteItem` paths, which call `updateTag('items')` only — bumping `updated_at` there means list reads (`getListsByUser`, list detail, tagged `lists`) go stale unless those paths also revalidate `lists`. The change must add `updateTag('lists')` where membership changes occur without it today.
- No DB driver concerns: single-statement bumps, no transactions needed (a missed bump on partial failure is acceptable residual).
