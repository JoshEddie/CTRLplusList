## Context

`lists.updated_at` is written exactly once — `defaultNow()` at insert (`db/schema.ts:58`). No mutation path sets it afterward: `updateList` builds its `updateData` from name/subtitle/occasion/date only, `setListVisibility` writes visibility/shared/shared_at, and all membership writes (`setListItems`, `updateItemLists`, `updatePriority`) touch `list_items`, never `lists`. The hero footer ("N items · updated T ago", owned by `list-hero-header`) therefore renders creation age, not update recency.

The scoping question — *which* mutations count as an update — was resolved in exploration with the **notification razor**: a mutation bumps `updated_at` iff it is the kind of change you would notify a follower about. Detail edits and membership changes qualify; reorders, item field edits, archive flips, visibility changes, and claims do not. Claims are additionally a hard exclusion: a claim-driven bump would leak claim activity to the owner through the timestamp (spoiler hazard).

## Goals / Non-Goals

**Goals:**

- `updated_at` advances on real detail edits and on item add/remove, from every path that produces those changes (list edit form, choose-items save, item-form list membership, item deletion).
- No-op saves never advance the timestamp — enforced server-side, short-circuited client-side.
- List reads reflect the new timestamp immediately (cache tags revalidated on every bumping path).

**Non-Goals:**

- No change to the hero footer rendering contract (`list-hero-header` owns it; it keeps rendering whatever `updated_at` holds).
- No backfill or migration: existing rows where `updated_at = created_at` honestly mean "unchanged since creation".
- No activity log / per-event history (the issue mentions "an update at log" — a single recency timestamp satisfies the user-visible need; an event log is a separate feature).
- No bump for reorder, item field edits, archive/unarchive, visibility, claims/purchases.

## Decisions

### D1: App-level `touchLists` helper, not a DB trigger or `$onUpdate`

A Postgres trigger on `list_items` cannot distinguish a membership change from `updatePriority`'s position writes or `rebalanceList`'s maintenance rewrites — it would bump on reorders and silent rebalances, violating the razor. Drizzle's `$onUpdate` only fires on `lists`-table updates, missing the main case entirely, and would also bump on visibility writes. Selectivity is the requirement, so the bump must live at the call sites: a `touchLists(listIds: string[])` helper (single `UPDATE lists SET updated_at = now-ish WHERE id IN (...)`) in `lib/data`, called by exactly the qualifying mutations. Trade-off: future mutations must remember to call it — mitigated by the `list-update-recency` spec being the normative checklist.

Home: `lib/data/list.ts` already owns list reads; the helper is a write, so it lives with the list actions' internal helpers. It is NOT exported from a `'use server'` module (same rationale as `item.associations.ts` — exporting from one would expose it as a client-callable endpoint). A small internal module (e.g. `lib/data/list.touch.ts` or co-located in `item.associations.ts`-style internal module) keyed to `data-layer-organization` conventions; exact file chosen at apply time within those constraints.

### D2: Server-side dirty check in `updateList` reuses the existing fetch

`updateList` already fetches the list row for its ownership check with `columns: { user_id: true }`. Widening that select to include `name, subtitle, occasion, date` costs zero extra queries and lets the action compare validated input against stored values, writing (and bumping) only when something differs. When nothing differs the action issues **no UPDATE at all** and returns success — same shape as `setListItems`' existing "No changes" early return. `date` compares by value (`getTime()`), not identity; `subtitle` compares post-normalization (trimmed-or-null per `list-metadata`), so `null` vs omitted follows the existing partial-update gate (`!== undefined`).

Rejected alternative — trusting the client's pristine check alone: the server action is a public endpoint; a stale tab, double-submit race, or future caller without the check would bump on identical data. Mirrors the repo's existing client-validates-for-UX / server-validates-for-authority split (`ListSchema`).

### D3: Client-side pristine check compares the form's own serialized state

`ListForm` snapshots its serialized field values at mount and compares at submit; pristine ⇒ skip the action call entirely (no round-trip, no toast churn), behaving as a successful no-op (modal closes / navigation proceeds as on success). Comparing form-encoding-to-form-encoding sidesteps `Date`-vs-string and `null`-vs-`''` normalization mismatches that comparing against the raw DB row would invite. Create mode has no pristine concept (submit always creates).

### D4: Bump granularity for membership paths

- `setListItems`: bump after a non-empty diff (the existing early return already filters no-ops).
- `updateItemLists` (item form): bump **only** the lists actually gaining or losing the item — the inserted set plus `listIdsToDelete` — never the unchanged ones.
- `deleteItem`: membership rows vanish via `ON DELETE CASCADE`, so the affected list ids must be captured **before** the delete (one select on `list_items`), then bumped after the delete succeeds.
- `archiveItem`: no bump. Archive hides the item from list views but the membership row persists and the flip is reversible; bumping would make archive/unarchive flapping read as list news. Recorded as a deliberate exclusion.

### D5: Cache-tag revalidation accompanies every bump

List reads are tagged `lists` (`'use cache'` + `cacheTag`). `updateList` and `setListItems` already call `updateTag('lists')`. `updateItemLists` and `deleteItem` currently revalidate only `items` — once they bump `updated_at` they must also call `updateTag('lists')`, otherwise the hero/footer and `getListsByUser` ordering (which sorts by `updated_at` desc) serve stale timestamps.

### D6: No transaction around mutation + bump

neon-http forbids interactive transactions (DATABASE.md). The bump is a separate statement after the membership write; if it fails, the result is a stale-by-one-event timestamp — accepted residual, self-healing on the next qualifying mutation. No DB-layer backstop needed.

## Risks / Trade-offs

- [Future mutation forgets to call `touchLists`] → the `list-update-recency` spec enumerates the bump matrix normatively; spec review of any new list mutation checks against it.
- [Bump statement fails after membership write succeeds (no transaction)] → accepted residual per D6; timestamp under-reports, never over-reports.
- [`getListsByUser` orders by `updated_at` desc — lists will now reshuffle on edits] → this is the intended semantic ("recently updated first" becomes true); noted so the behavior change isn't mistaken for a regression.
- [Client pristine check drifts from server dirty check] → server remains authority; worst case is a wasted round-trip that the server no-ops.
- [Existing lists show very old "updated" dates after deploy] → correct by definition (nothing changed since creation); no backfill.
