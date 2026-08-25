# Active-profile switcher

Source issue: https://github.com/JoshEddie/CTRLplusList/issues/193
Map: [MAP: Dependents and shared list management #181](https://github.com/JoshEddie/CTRLplusList/issues/181)

## Why

Profiles exist, are listed, and can be created — but nothing can *act as* one. A managed profile today is a row its owners can rename and nothing more: every list and item an account creates still lands on that account's self-profile, because the actor seam resolves the self-profile and offers no choice. The schema phases and the Profiles page landed the standing parts of the model and deliberately stopped at the moving one, leaving two seams already cut for this change and consumed by nothing: the authorization seam's resolved profile is specified to mean *the profile this request acts as* against the day it becomes switchable, and the profile card is specified inert on click with card-click reserved for switching.

This change closes those seams. It makes one of the viewer's profiles active, and routes creation and ownership through it.

## What Changes

### Active profile as a resolved, switchable value

- The actor seam resolves an **active profile** rather than always the self-profile. The active profile is one the viewer holds `self`, `owner`, or `manager` on; membership is re-checked server-side on every resolution, so a stale or forged selection resolves to the self-profile rather than granting reach.
- The selection persists across requests and sessions for the viewer, and falls back to the self-profile whenever it cannot be honoured — no membership, profile deleted, nothing stored.
- The seam stops carrying one profile. `authedIdentity` returns the **self** profile and the **active** profile as separate values, and the single `profile` field is removed rather than reinterpreted — so every call site chooses which it means instead of inheriting a meaning that changed underneath it.

### The active profile is the authorization context

- Ownership is **equality against the active profile**. Writing to a profile's content requires acting as that profile; holding a membership on it is not, by itself, authorization. This supersedes [#202](https://github.com/JoshEddie/CTRLplusList/issues/202)'s "ownership comparisons become membership containment": resolving writes across every profile a human is attached to would make *acting as* gate nothing, which is the wrong precedent whatever it buys.
- Every profile-scoped write re-checks `owner`-or-`manager` membership on the target profile server-side. The client's claim about which profile is active is an input, never a grant.
- Because content is always created by the profile that owns it, `list-item-management`'s rule that items belong to their list's owner holds by construction rather than by vigilance.

### The split between acting-as and being

The switcher governs write and ownership only ([#202](https://github.com/JoshEddie/CTRLplusList/issues/202)). Claims stay a human act and keep storing the actor's self-profile; the home rails, feed, `/purchased`, connections, the follow button, and visit history stay the human's. Blocks are the human's too: the blocker end is always the actor's self-profile, and a block filters what that human sees whatever profile they are acting as. This change draws that line explicitly at the seam rather than letting every call site infer it.

### The switcher

- The nav avatar renders the **active** profile — its initials, its accent as a ring — rather than the account's Google image, so the surface always says who the viewer is acting as. The account image leaves the nav entirely; it keeps feeding follower, purchaser and list surfaces until [#199](https://github.com/JoshEddie/CTRLplusList/issues/199) lands avatar art.
- Its dropdown gains the switch: a bounded set of rows ordered by recency, the active profile excluded, and a "Back to `<self name>`" row when the active profile is not the viewer's own. The Profiles page is the full switcher past that bound.
- The profile card stops being inert: card-click becomes *switch*, which is what `profiles-surface` reserved it for. The card's existing management menu keeps `Edit <name>` and gains a switch row — the only keyboard-reachable path to switching — so the menu remains the card's management home rather than being reshaped.
- Creation surfaces name the profile they create for, so the identity that will own the new row is stated where it is read rather than inferred from an avatar.
- `/lists` and `/items` are **not** rebuilt. They already read the resolved profile, so they render the active profile's content unchanged — that is the point of the seam. Their **empty** states do change: an empty profile-scoped surface looks identical whichever profile is active, which is exactly when a viewer who has switched reads someone else's empty view as their own content having vanished. The empty state gains a route to the Profiles page beside its create affordance, in copy that names no profile.

### Recency, so the switcher scales

A viewer may run many profiles. Ordering the switch rows requires knowing which profiles a human actually uses, which nothing records today. Membership rows gain a last-active timestamp, stamped when a profile is switched to and when it is written as, so revoking a membership takes its ordering with it and no client-supplied list has to be filtered.

## Capabilities

### New Capabilities

- `active-profile`: What the active profile is, how it resolves and persists, which memberships may be selected, what it governs (creation and ownership) versus what stays the human's (claims, rails, feed, connections, blocks), the fallback rules, the switching surfaces and their ordering, and the creation-time statement of which profile new content is for.

### Modified Capabilities

- `server-endpoint-authorization`: The seam's resolved profile becomes the active profile rather than always the self-profile — the requirement already anticipates this — the seam exposes the self-profile alongside it, and profile-scoped writes gain the `owner`-or-`manager` membership check on the target.
- `profiles-surface`: Card-click changes from inert to switch, and the card's management menu gains a switch row.
- `app-frame`: The nav avatar renders the active profile with its accent ring instead of the account image, and its dropdown carries the switcher.
- `profiles-data-model`: Membership rows gain a last-active timestamp; the `BYPASS_ACTIVE_PROFILE` dormant seam is removed rather than consumed; and the seed gains the fixtures the switch path needs.
- `empty-state-system`: The `Empty` primitive gains an optional secondary action rendered after its CTA, so a profile-scoped surface with nothing to show can offer the way back without a page-scoped one-off.
- `following`: A block's blocker end is named as the actor's **self**-profile rather than whichever profile they act as, and block checks resolve the viewer by self-profile — so a block belongs to the human who made it and does not change meaning when they switch.

## Impact

### Code

- `lib/data/user.session.ts` — `authedIdentity` resolves both profiles and drops the single `profile` field. This is the blast-radius centre: ~38 call sites read it, and removing the field turns every one into a compile error, which is the property that makes the self-versus-active split a decision at each site rather than a default.
- `lib/data/profile.ts` / `profile.identity.ts` — active-profile resolution and a lean memberships read carrying role and last-active, alongside the existing `self` traversal.
- `lib/data/profile.actions.ts` — the switch action; and `blockUser` / `unblockUser` pinned to the self-profile.
- `lib/data/purchase.ts` — claim display resolved by the self-profile, so a viewer's own claims keep their unclaim affordance while acting as another profile.
- `lib/auth.ts` — the `BYPASS_ACTIVE_PROFILE` seam and the bypass avatar constant are removed.
- `app/(auth)/ui/components/UserAvatarPopover.tsx` — currently renders `session.user.image`/`name`; moves to the active profile and gains the switcher rows.
- `app/(main)/profiles/` — card-click and the menu's new row.
- List and item creation forms — the statement of which profile the new row is for.

### Persistence

The active selection lives in a per-browser cookie; the recency ordering lives on the membership row. Each store holds the thing whose lifetime matches it — the mode the viewer is in at this keyboard, and how they use their profiles over time. Neither is trusted without a membership re-check.

### Caching

Reads keyed to the resolved profile vary by a value that can change without a write. Cache tags are all static global strings today and [#309](https://github.com/JoshEddie/CTRLplusList/issues/309) deliberately leaves that alone, so switching must be correct without tag narrowing.

### Not in scope

- The list-creation "For:" selector and its inline new-profile escape — removed from this change's scope by owner decision: creating a list for another profile means switching to it first, so that one surface writes content outside the acting context.
- Spoiler exposure when viewing a list owned by a profile the viewer runs but is not acting as — routed to [#197](https://github.com/JoshEddie/CTRLplusList/issues/197), which owns the per-viewer cascade.
- The blocker-side block cascade across owned profiles — carried to the circle remap ([#298](https://github.com/JoshEddie/CTRLplusList/issues/298)) with the rest of the blocking overhaul.
- Roles enforcement and the Permissions section ([#194](https://github.com/JoshEddie/CTRLplusList/issues/194)) — this change enforces the membership floor at the seam, not the per-capability role matrix.
- Avatar art ([#199](https://github.com/JoshEddie/CTRLplusList/issues/199)) — the nav avatar uses the initials fallback until it lands.
- Transfers ([#198](https://github.com/JoshEddie/CTRLplusList/issues/198)), birth-form reshaping ([#314](https://github.com/JoshEddie/CTRLplusList/issues/314)).
