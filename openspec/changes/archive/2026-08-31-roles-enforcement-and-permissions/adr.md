<!-- The delta against the ADR library at `openspec/adr/`. Contract: the adr
     artifact instruction in schema.yaml. -->

## ADDED ADRs

### 2026-08-30-owners-run-the-profile-managers-run-its-content

**Touching**: `DAL`

**Context**: `profile_members.role` has admitted `self | owner | manager` since the phase-1 backfill, but the shared write gate admitted all three alike, so the role narrowed nothing and a manager could delete a profile's lists and items. Drawing the line per endpoint was rejected: thirteen call sites already reach the gate and each new one would re-decide the question, which is how the role became decorative in the first place.

**Decision**: Owners run a profile — its membership and its identity — and hold every irreversible or reach-changing act; managers do everything else about its content. The shared write gate takes a **required** floor argument of exactly two values, `member` (`self | owner | manager`) and `owner` (`self | owner`), with no default, so a profile-scoped write added later must name where it sits rather than inherit admission. The floor is applied to the profile the write is **addressed** to. For a write over a profile's content that is the profile the request acts as, and the floor is checked after the acting-profile equality check and never instead of it. For a write over a profile **itself** — its identity, its membership — the request names the profile, because those surfaces are reached without switching to the profile they administer; such a write does not pass the gate and checks the same floor against the actor's membership on the named profile, which is how profile settings already authorize. Either way a role narrows what a write may do and never widens what it may reach, since a floor admits an actor only on a profile they already hold a membership on. A write that guests can also reach likewise does not pass the gate and carries the same floor inside its own authorization helper.

**Consequences**: Placing a new write becomes a two-bit decision a reviewer can check — which floor, and which profile the write is addressed to — and widening a role is one argument rather than an audit. The cost is that the two floors cannot express a middle tier, so a right that is neither content nor governance — publication, were the `list-visibility` split on #335 to land — forces a third value rather than fitting the existing pair.

### 2026-08-30-a-cardinality-floor-is-a-guarded-single-statement

**Touching**: `DATABASE.md`, `DAL`

**Context**: A profile must keep at least one owner, and `neon-http` offers no interactive transaction to read the count and act on it. A unique index cannot express the invariant — uniques bound a set from above, not below — and `2026-08-18-atomic-writes-in-one-cte` does not reach the case either, since the hazard is one write racing a concurrent one rather than a pair half-applying, and two concurrent single-statement CTEs race identically.

**Decision**: A cross-row cardinality floor is enforced by folding its guard into the mutating statement itself — `DELETE … AND EXISTS (SELECT 1 … WHERE <the survivor condition>)` — so the check evaluates at statement time rather than at request time, and zero rows affected is the refusal. A read-then-write pair is not used for this. The residual window under true concurrency is named in the spec rather than assumed away, and is acceptable only where the state it lands in is one the application already tolerates by another route.

**Consequences**: The invariant costs one round trip instead of two and narrows the race to a single statement's duration, but does not close it, so any such floor must have a tolerable failure state before this shape is chosen. It also makes the guard's *absence* meaningful: where an operation's own actor is necessarily a survivor, adding the `EXISTS` clause would be a redundant guard, and the reasoning has to be recorded or a later reader will add one back.

### 2026-08-30-a-forbidden-affordance-renders-disabled

**Touching**: `Role-Gated UI`

**Context**: The profile space shipped a manager view that omits the Settings submit control entirely, on the reasoning that a disabled control offers nothing to act on. In use it reads as a surface with no such feature rather than one the viewer lacks the right to use, and the same question was about to be answered a second time, differently, for the Permissions section on the same page.

**Decision**: A control the viewer's role forbids renders **disabled**, not absent, so the surface communicates that the capability exists and that this viewer does not hold it. The server action remains the enforcement; the disabled control is never relied on.

**Consequences**: Role-gated surfaces look the same to every member, which makes the role legible without a legend, at the cost of rendering controls that can never fire and must each carry an accessible disabled state. It also means a role's powers are inferable from the UI by anyone who can see the surface.

### 2026-08-30-an-invite-link-is-a-single-use-capability-grant

**Touching**: `DB Schema`, `DAL`

**Context**: A profile needs a way to admit a member, and the surface settled on #183 was a direct add from the acting owner's mutual follows. The app has no notification and no acceptance step, so a direct add makes someone a manager of another person's profile without telling them and without asking — and it binds admission to the follow graph, which #298 is about to replace anyway. Every authorization in the app until now has been membership-derived: the actor holds a row, and the row decides. Admission cannot be, because the person being admitted holds no row yet.

**Decision**: Admission to a profile is by **single-use invite link**, and it is the only route in — no direct add of any kind survives. An owner mints a token that names the profile and the role it grants; whoever holds the token may redeem it once, and redeeming it is the acceptance the app otherwise has no mechanism for. The token is a **bearer capability**: it authorizes on possession rather than on membership, which makes it the one write in the profile-scoped set whose actor is not required to hold a membership on the profile it touches, and the reason `server-endpoint-authorization` carries a third exemption. Because a bearer capability is only as narrow as its lifetime, it is bounded on three axes at once — one redemption, seven days, and one role fixed at mint time — rather than by knowing who the recipient is, which the link deliberately does not. Redemption is an explicit act by the recipient and never a side effect of loading the page, and consuming the token and writing the membership row are one data-modifying CTE per `2026-08-18-atomic-writes-in-one-cte`, whose fixability test this fails in the worst way: a spent token with no membership behind it can be repaired by nobody, since the recipient cannot redeem twice and the owner never learns it happened. A link admits and does nothing else — redeemed by an account that already holds a membership it is consumed and the standing role is untouched, so a link can never promote or demote. While it is still unredeemed the capability stays the minting owner's to amend: its role may be narrowed or widened and the link revoked outright, both guarded on the token being unspent, so neither can reach back through a redemption that has already granted a membership.

**Consequences**: Consent is structural rather than a feature to be built later: no account can be made to run a profile without performing an act, so the notification-and-accept system the direct add was missing is not owed. The follow graph stops gating administration entirely, which frees #298 to remap association without an approximation left behind here. The costs are real and accepted: the link is transferable, so whoever the holder forwards it to is who joins, and the mint-time role and seven-day window bound it, and an owner may narrow that role or revoke the link outright for as long as it is outstanding, because the Permissions roster lists it as a seat nobody has taken yet; and a refusal cannot say why, since distinguishing an unknown token from an expired or spent one tells a stranger that a token existed.

### 2026-08-31-a-role-carries-its-own-rights

**Touching**: `DAL`

**Context**: The role vocabulary was spelled by hand in roughly ninety places across thirty-three files — two unions in `lib/types.ts`, a tuple plus three overlapping subset constants in `profile.roles.ts`, the column CHECK, seed and test fixtures — and the rights each role holds were expressed as predicates over those spellings (`meetsFloor`, `belowOwnerFloor`, `isGrantableRole`), each with its own membership-test style. Renaming a stored value meant finding every spelling, and a missed one still compiled. Two surfaces had already routed around the predicates and compared a role's name inline, which is the drift the predicates existed to prevent.

**Decision**: A role is one record carrying its stored value, its display label, and the two rights that distinguish it — whether it acts on the profile itself as well as its content (`admin`), and whether it marks the account the profile *is* (`isSelf`, which is also what makes it ungrantable, since a link admits a member and the identity relation is not a membership anyone can hand out). Surfaces read a right off the record; no rule is a comparison against a role's name. The stored value has one home, so renaming it is one edit plus its migration. The set predicates and the label map are deleted rather than rehomed. `authedWriter` keeps its required floor argument — that is a call-site forcing function, not a lookup — but resolves it as `!role.admin`.

**Consequences**: Adding a role is one record the compiler carries everywhere, and adding a right is one field rather than a predicate plus its call sites. A stored value renames without a sweep. Two costs are accepted. The column is `text`, so a read maps the value back to its record at the DAL boundary and SQL predicates send `.value` — deliberately the only seam. And a role must never be compared by reference: RSC serialization rebuilds the object crossing into a client component, so `role === OWNER` holds on the server and fails on the client. The two flags cover every comparison the app makes, so nothing needs identity today, but a call site that reached for it would fail silently and only below the client boundary.

## Proposed term-bank additions

| Term | Covers |
| --- | --- |
| `Role-Gated UI` | rendering a control the viewer's role forbids |

## MODIFIED ADRs

_None._

## REMOVED ADRs

_None._
