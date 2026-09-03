# CTRLplusList

A family gift-list app. Profiles curate lists of items they want; other people
claim those items so the owner is not told what they are getting.

This file records what each term means **right now**. It is not a contract — a
change that makes an entry false updates the entry in the same diff. Silent
drift is the failure, not the change.

## Naming

**CTRLplusList**:
The project name, used in the repo, docs, and this file.
_Avoid_: CtrlPlusList, Ctrl List

**Ctrl+List**:
The product name, used in every user-facing surface and in `app/layout.tsx`.
The domain is `ctrlpluslist.com`.

## Identity

**Account**:
One human's sign-in — a row in the `user` table. Owns nothing directly; reaches
content only through a membership. "User" is used interchangeably in code and
conversation; the duplication is an artifact of the OAuth adapter.

**OAuth credential row**:
A row in the `account` table, owned by NextAuth and referenced only by the auth
adapter. Despite the table name, this is **not** what "account" means anywhere
else in the codebase.

**Profile**:
The entity that owns all content — lists, items, claims all carry a
`profile_id`. Carries no account reference of its own; every link to a human
runs through a membership.

**Altvatar**:
The user-facing name for a whole profile — an alter ego with its own look,
lists, and items. Code and schema say `profile`; the two vocabularies are
deliberately different ([ADR-0012](docs/adr/0012-altvatar-names-the-whole-profile.md)).
_Avoid_: using Altvatar for the artwork alone — that is the look.

**The look**:
A profile's generated art plus its accent colour.
_Avoid_: face, avatar, profile picture

**Membership**:
The `(account, profile, role)` row that is the sole handle onto a profile.
Grants, revocations, and role changes all act on this row.

**Self-profile**:
The one profile that *is* a human, one per account, enforced by partial-unique
indexes in both directions. Anything naming the human — follows, blocks, claim
assertion — resolves to the self-profile.

**Managed profile**:
A profile with no self membership; nobody signs in as it. A child, a couple, a
household.

**Active profile**:
The profile the current request acts as, selected by the `active_profile` cookie
and re-verified against membership on every request. Ownership columns and
creation take the active profile
([ADR-0002](docs/adr/0002-every-request-names-two-profiles.md)).
_Avoid_: acting profile, current profile

**Acted-as**:
The timestamp recording when an account last acted as a profile. Coarsened to an
hour, and it orders the profile switcher.

**Role**:
One of `self`, `owner`, or `manager`. `self` and `owner` are admin; `manager` is
not; `self` is never grantable.

## Content

**List**:
A profile-owned collection of items, with an occasion and a visibility.

**Item**:
A profile-owned wish entry. Belongs to the profile, not to a list — an item on
no list is visible to its owner only.

**Item library**:
A profile's entire item set, independent of any list.

**List entry**:
An item's presence on one list, carrying the position it holds there, the
quantity wanted there, and the claims made against it. An item on several lists
has one entry per list, and the entries share nothing — adding an item to a list
creates its entry at quantity 1. Stored as `list_items`, whose name reads like a
pure join table even though what it carries belongs to the entry rather than to
the item or the list.

**Soft removal**:
What taking a *claimed* item off a list does. Removing an unclaimed entry
deletes it outright; removing one that carries claims keeps the row and hides
it, so the owner stops seeing it, the people holding claims keep both the record
and the ability to manage them, and no new claim can land on it. Re-adding the
same item restores the entry, its quantity, and its claims, at the **end** of
the list — no position survives a removal. The ghost is per-item claim state, so
it reaches its owner only at the `claims` tier: below that, removal looks
identical whether or not anyone had claimed
([ADR-0015](docs/adr/0015-behaviour-may-not-vary-on-spoiler-hidden-state.md)).
_Avoid_: archived, deleted — the entry is neither, and only a claim can put one
in this state.

**Quantity**:
How many of an item its owner wants **on one list** — the only quantity there
is, since an item carries none of its own. The same item asked for once at a
birthday and four times at Christmas is two entries with two quantities. Set
from the list being looked at, through the row's kebab menu, and shown on the
row only when it is above 1. There is no unlimited quantity, and none above 99.
Lowering it below what is already claimed succeeds quietly: refusing would tell
an owner held below the claims tier that somebody has bought something
([ADR-0015](docs/adr/0015-behaviour-may-not-vary-on-spoiler-hidden-state.md)).

**Units**:
What a claim covers, and what quantity is counted in — capacity is measured in
units rather than in people, so four towels is satisfied by one person buying
four, by four people buying one each, or by any split between. A claim covers
one unit unless its claimer says otherwise; the stepper that says otherwise is
capped at what remains, and hidden wherever that leaves one number to pick — an
entry asking for one, or one unit left of many. Units move up and down within
what remains, and dropping a claim to zero *is* unclaiming — a zero-unit row is
not representable. A per-claim unit count is visible only to the claim's holder
and at the revealed tier; the claims tier
keeps its bare presence flag. Claimed units are summed from the claims
themselves, never kept as a separate running total
([ADR-0016](docs/adr/0016-claimed-units-are-summed-not-stored.md)).

**Occasion**:
The free-text or picked label on a list, rendered as its eyebrow.

**Store**:
A purchase link and price attached to an item. An item may have several, ranked;
one is primary.

**Linkless store**:
A store row with a price but no navigable link. It still supports claiming, but
offers nothing to open.

**Active image**:
The chosen image for an item, marked on the image row itself rather than on the
item.

**Placeholder art**:
Generated artwork minted for an item that has no image, stored the same way as a
look ([ADR-0009](docs/adr/0009-generated-art-is-baked-and-persisted.md)).

## Claims

**Claim**:
A statement that someone is getting an item for its owner, made against one
**list entry**. A claim on one list consumes nothing on another, and an item on
no list cannot be claimed at all. The app cannot make a purchase, cannot track
one, and cannot verify that one happened — only that somebody said they would.
"Claim" is the strongest true word, which is why it is used everywhere a person
can see, over the `purchases` table it is stored in.
_Avoid_: purchase, buy — accurate for neither what the app does nor what it knows

**Purchaser**:
The profile a claim is recorded *for*.

**Asserter**:
The profile that recorded the claim. Usually the same as the purchaser, and
deliberately separable.

**Attributed claim**:
A claim whose purchaser is someone other than the asserter — recording that a
third party is getting the item. Restricted to the owner's circle.

**Guest claim**:
A claim with no identity at all, held only by a cookie
([ADR-0008](docs/adr/0008-guest-claims-are-cookie-held.md)).

**Master unclaim**:
An item owner removing anyone's claim. The only removal route that needs admin.
The owner may also move the units on a claim somebody else made — the same
right, since dropping one to zero is removing it.

**Circle**:
The set of people eligible to be named as a purchaser — the owner's mutual
follows, minus blocks.

## Spoilers

**Spoiler tier**:
How much claim information a viewer is willing to see, ordered `surprise` →
`progress` → `claims`. Held per account, per profile.

**Baseline**:
The tier a viewer's *account* holds on the profile that owns the content — never
the active profile's.

**Profile spoiler default**:
The tier a new membership is seeded with. A seed only; never consulted again for
a sitting member.

**Claim projection**:
What a viewer actually sees for a claim, after their tier is applied. Adds
`revealed`, which is never stored and never comes from a URL.

**Spoiler param**:
A `?spoiler=` value, interpreted as a *delta from the viewer's baseline* — so the
same link shows different things to different people.

## Social

The social graph is being reworked. These entries describe today's shape.

**Follow**:
An edge from an **account** to a **profile**. Asymmetric by construction: a
profile is never a follower.

**Block**:
An edge between two profiles, always written and read with the blocker's
self-profile. Beats visibility.

**Bookmark**:
A saved list, stored as a timestamp on the viewer's visit row.
_Avoid_: favorite — used only as the column name

**Visit**:
The record that a viewer opened a list, with a count and a last-seen time.

**Digest**:
The home page's collapsible sections of recent and followed activity.
_Avoid_: feed, rail — "rail" names the UI component, not the concept

## Access

**Visibility**:
Who may see a list: owner-only, link-only, or followers. **Currently mid-migration**
— code constants, database strings, and UI labels disagree, and one concept has
several names until it lands (issue #344).

**Invite**:
A single-use capability grant. Whoever holds the token may redeem it once;
revoking deletes it rather than marking it spent.

**Onboarding gate**:
The check that an account has a self-profile and that profile has a look.
Derived on every request, never stored.

**Accent**:
A profile's chosen colour, stored as a preference.
