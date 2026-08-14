# guest-claim-identity Specification

## Purpose
guest-claim-identity governs how a signed-out guest's claim is tied to the browser that made it, via a server-only `guest_claims` identity cookie, so the guest can see and manage their own claim. It defines the cookie's contents, attributes, and validation, and the request-scope overlay that marks cookie-identified claims as the viewer's own on guest-visible surfaces — presenting a guest's own claim exactly as an authenticated self-claim.
## Requirements
### Requirement: A signed-out guest claim SHALL write a browser identity cookie

`createPurchase`'s signed-out guest path (unauthenticated caller, non-empty `guest_name`) SHALL, after a successful insert, set a cookie named `guest_claims` whose value is JSON `{ id, name, purchases }`:

- `id` — a stable guest identifier: `crypto.randomUUID()` minted when no valid cookie exists, reused verbatim from the existing cookie otherwise. One id per browser for the cookie's lifetime.
- `name` — the guest name entered on the most recent guest claim.
- `purchases` — the ids of the guest's claims from this browser, newest first, the just-inserted purchase id prepended. The list SHALL be bounded by a design-recorded constant cap (50); ids beyond the cap SHALL be pruned oldest-first.

Cookie attributes SHALL be: `httpOnly`, `path=/`, `SameSite=Lax`, `Secure` outside local dev, and a max-age of 400 days, re-applied on every write so an active guest's cookie does not expire. The cookie SHALL be written and read exclusively server-side (server actions and request-scoped server rendering); no client code SHALL read or write it.

A cookie whose value is absent, unparsable, or fails shape validation SHALL be treated as absent — the next guest claim mints a fresh identity and overwrites it.

#### Scenario: First guest claim mints the cookie

- **WHEN** an unauthenticated caller with no `guest_claims` cookie successfully records a guest claim
- **THEN** the response sets a `guest_claims` cookie containing a freshly generated UUID `id`, the entered name, and a `purchases` list holding exactly the new purchase id

#### Scenario: Subsequent guest claim extends the cookie

- **WHEN** an unauthenticated caller holding a valid `guest_claims` cookie records another guest claim
- **THEN** the rewritten cookie keeps the same `id`, stores the newly entered name, and prepends the new purchase id to the existing `purchases` list

#### Scenario: Malformed cookie is replaced, not trusted

- **WHEN** an unauthenticated caller whose `guest_claims` cookie holds unparsable or shape-invalid content records a guest claim
- **THEN** the claim succeeds and the cookie is overwritten with a fresh identity, as if no cookie had existed

#### Scenario: Authenticated claims never touch the cookie

- **WHEN** an authenticated caller records any claim (self, attributed, or guest-name)
- **THEN** no `guest_claims` cookie is written or modified

### Requirement: Cookie-identified claims SHALL be marked claimedByViewer by a post-cache request-scope overlay

For a request with no session viewer, every server-rendered surface that hands guest-visible claim state to client components SHALL, after the cached DAL read returns, mark each purchase whose id appears in the request's valid `guest_claims` cookie as the viewer's own claim — `claimedByViewer: true` and the viewer-own display marking (`by: 'self'`) — before the data reaches the client. A cookie-identified claim therefore presents exactly as an authed self-claim ("You" in the card banner, "{first name} (you)" in the manage list, no attribution meta line); the "Added by you" attribution line never fires for a guest's own claim (per `claim-attribution`'s display requirement).

The overlay SHALL run only in request scope. The cookie, and any value derived from it, SHALL NOT be read inside a `'use cache'` boundary or passed as an argument into one — cached reads for signed-out viewers continue to execute with no viewer identity, and their cached output remains the shared signed-out variant. Requests with a session viewer SHALL NOT apply the overlay; authenticated recognition remains session-based.

#### Scenario: Guest sees their own claim as theirs

- **WHEN** a signed-out request carries a `guest_claims` cookie listing purchase P, and the rendered list contains the item P targets
- **THEN** P reaches the client marked `claimedByViewer: true` and `by: 'self'`, and every purchase not listed in the cookie reaches the client unmarked

#### Scenario: Cached output stays viewer-free

- **WHEN** two signed-out requests with different `guest_claims` cookies render the same list
- **THEN** both are served from the same cached DAL output, and the differing `claimedByViewer` marks are applied per-request after the cached read

#### Scenario: Authenticated viewer is unaffected by a leftover cookie

- **WHEN** a request has a session viewer and also carries a `guest_claims` cookie
- **THEN** `claimedByViewer` derives solely from the session identity and the overlay is not applied

### Requirement: Guest self-removal SHALL prune the removed id from the cookie

When `removePurchase` deletes a row authorized by the guest cookie path, the action SHALL rewrite the `guest_claims` cookie with the removed purchase id pruned from `purchases`, preserving `id` and `name`.

#### Scenario: Removal prunes the cookie

- **WHEN** a signed-out guest removes their cookie-identified claim P
- **THEN** the rewritten cookie no longer lists P and retains the guest's `id`, `name`, and remaining purchase ids

### Requirement: The cookie's guest id and name SHALL stay dormant in this capability

No code path in this capability SHALL write the cookie's `id` to the database or branch on it, and no UI SHALL display the cookie's `name`. They are carried as the forward-compatibility seed for durable loginless guest accounts ([#170](https://github.com/JoshEddie/CTRLplusList/issues/170)): a returning guest's cookie holds a stable `id` plus their purchase ids, so that change can materialize a real user and adopt those claims without back-filling blind.

#### Scenario: Recognition and removal key off purchase ids only

- **WHEN** the overlay marks claims or `removePurchase` authorizes a guest removal
- **THEN** the decision uses the cookie's `purchases` list alone; the `id` and `name` fields are never consulted

