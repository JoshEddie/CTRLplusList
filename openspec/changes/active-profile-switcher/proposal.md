# Active-profile switcher + list-creation For: selector

Source issue: https://github.com/JoshEddie/CTRLplusList/issues/193
Map: [MAP: Dependents and shared list management #181](https://github.com/JoshEddie/CTRLplusList/issues/181)

## Why

Profiles exist, are listed, and can be created — but nothing can *act as* one. A managed profile today is a row its owners can rename and nothing more: every list and item an account creates still lands on that account's self-profile, because the actor seam resolves the self-profile and offers no choice. The schema phases and the Profiles page landed the standing parts of the model and deliberately stopped at the moving one, leaving three seams already cut for this change and consumed by nothing: `BYPASS_ACTIVE_PROFILE` is declared dormant in `lib/auth.ts`, the authorization seam's resolved profile is specified to mean *the profile this request acts as* against the day it becomes switchable, and the profile card is specified inert on click with card-click reserved for switching.

This change closes those seams. It makes one of the viewer's profiles active, routes creation and ownership through it, and gives list creation a per-creation override so a viewer need not switch just to make one list for someone else.

## What Changes

### Active profile as a resolved, switchable value

- The actor seam resolves an **active profile** rather than always the self-profile. The active profile is one the viewer holds `self`, `owner`, or `manager` on; membership is re-checked server-side on every resolution, so a stale or forged selection resolves to the self-profile rather than granting reach.
- The selection persists across requests and sessions for the viewer, and falls back to the self-profile whenever it cannot be honoured — no membership, profile deleted, nothing stored.
- `BYPASS_ACTIVE_PROFILE` stops being dormant and becomes the local-mode and e2e override, keeping both deterministic without a real switch interaction.

### The switcher

- The nav avatar renders the **active** profile — its art or initials, its accent as a ring — rather than the account's Google image, so the surface always says who the viewer is acting as.
- Its dropdown gains the switch: a row per profile the viewer runs, and a "Back to `<self name>`" row when the active profile is not the viewer's own.
- The profile card stops being inert: card-click becomes *switch*, which is what `profiles-surface` reserved it for. The card's existing management menu keeps `Edit <name>` and gains a switch row, so the menu remains the card's management home rather than being reshaped.
- `/lists` and `/items` are **not** rebuilt. They already read the resolved profile, so they render the active profile's content unchanged — that is the point of the seam.

### The split between acting-as and being

The switcher governs write and ownership only ([#202](https://github.com/JoshEddie/CTRLplusList/issues/202)). Claims stay a human act and keep storing the actor's self-profile; the home rails, feed, and following graph stay the human's. This change draws that line explicitly at the seam rather than letting every call site infer it, so the ~35 `authedIdentity` call sites do not each have to decide.

### List creation "For:" selector

- The list create form gains a **For:** selector defaulting to the active profile and listing every profile the viewer may create on, so making one list for another profile costs no switch.
- It carries an inline escape to create a new managed profile without leaving the form. The escape **reuses** the existing birth form rather than forking a variant — [#314](https://github.com/JoshEddie/CTRLplusList/issues/314) is still settling that form's shape after the avatar step, and a second copy would have to be reshaped twice.
- `createList` stops trusting the resolved profile alone: the submitted target is validated against the viewer's memberships before the row is written.

### Authorization

Every profile-scoped write checks `owner`-or-`manager` membership on the target profile server-side. The client's claim about which profile is active is an input, never a grant.

## Capabilities

### New Capabilities

- `active-profile`: What the active profile is, how it resolves and persists, which memberships may be selected, what it governs (creation and ownership) versus what stays the human's (claims, rails, feed), the fallback rules, the `BYPASS_ACTIVE_PROFILE` override, and the creation-time "For:" override on list creation.

### Modified Capabilities

- `server-endpoint-authorization`: The seam's resolved profile becomes the active profile rather than always the self-profile — the requirement already anticipates this — and profile-scoped writes gain the `owner`-or-`manager` membership check on the target.
- `profiles-surface`: Card-click changes from inert to switch; the card's management menu gains a switch row; the birth form gains a second call site, which supersedes its "exactly one call site" rationale.
- `app-frame`: The nav avatar renders the active profile with its accent ring instead of the account image, and its dropdown carries the switcher.
- `profiles-data-model`: `BYPASS_ACTIVE_PROFILE` stops being a dormant seam and gains its consumer, and the seed gains whatever fixture the switch path needs.

## Impact

### Code

- `lib/auth.ts` — `bypassActiveProfile()` gains its consumer.
- `lib/data/user.session.ts` — `authedIdentity` resolves the active profile; the self-profile stays reachable for the paths that must not follow the switcher. This is the blast-radius centre: ~35 call sites read it and none should need editing, which is the property to verify rather than assume.
- `lib/data/profile.ts` / `profile.identity.ts` — active-profile resolution and membership verification alongside the existing `self` traversal.
- `lib/data/list.actions.ts` — `createList` validates a submitted target profile.
- `app/(auth)/ui/components/UserAvatarPopover.tsx` — currently renders `session.user.image`/`name`; moves to the active profile and gains the switcher rows.
- `app/(main)/profiles/` — card-click and the menu's new row.
- `app/(main)/lists/ui/components/ListForm*.tsx` — the For: selector and its inline escape.

### Persistence

The active selection needs a store. Whether that is a cookie or a column is a design question, not settled here; the requirement is only that it survives a session and is never trusted without a membership re-check.

### Caching

Reads keyed to the resolved profile now vary by a value that can change without a write. Cache tags are all static global strings today and [#309](https://github.com/JoshEddie/CTRLplusList/issues/309) deliberately leaves that alone, so switching must be correct without tag narrowing.

### Not in scope

- Roles enforcement and the Permissions section ([#194](https://github.com/JoshEddie/CTRLplusList/issues/194)) — this change enforces the membership floor at the seam, not the per-capability role matrix.
- Avatar art ([#199](https://github.com/JoshEddie/CTRLplusList/issues/199)) — the nav avatar uses the initials fallback until it lands.
- Spoilers cascade ([#197](https://github.com/JoshEddie/CTRLplusList/issues/197)), transfers ([#198](https://github.com/JoshEddie/CTRLplusList/issues/198)), birth-form reshaping ([#314](https://github.com/JoshEddie/CTRLplusList/issues/314)).
