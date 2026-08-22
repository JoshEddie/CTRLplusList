# item-placeholder-art Specification

## Purpose

The `item-placeholder-art` capability guarantees no item ever displays as a dead, empty image container: it owns the deterministic placeholder-art generator (seeded DiceBear `shapes`, brand-derived baked palette, `data:image/svg+xml;base64` output), the lazy-mint path that materializes and persists art for imageless items on first view, and the transient preview generation the deck's photo card consumes.

## Requirements

### Requirement: A pure server-only generator SHALL produce deterministic placeholder art as a data URI

A generator module (`lib/placeholderArt.ts`) SHALL expose a pure function mapping a seed string to a `data:image/svg+xml;base64,...` URI rendered by DiceBear `shapes` (`@dicebear/core` pinned to 9.x — `@dicebear/shapes` has no core-10-compatible release). Colors SHALL be baked at generation from module-local hex constants organized as a small set of brand-derived palettes (a dark-primary, a light, and a dark-secondary configuration, each pairing a background with a shape-color set); the palette SHALL be picked deterministically from the seed, with shape colors then drawn by DiceBear's per-seed assignment — so saved art is self-contained, varies in background and color scheme as well as shape layout, and render-time theming is not involved; a rebrand is executed by changing the constants and regenerating affected art. The module SHALL export a URI-prefix constant (`data:image/svg+xml;base64,`-anchored) that validation and UI use to classify placeholder URIs without parsing SVG. The module SHALL NOT be imported into client bundles.

#### Scenario: Same seed yields identical art

- **WHEN** the generator is called twice with the same seed
- **THEN** both calls return byte-identical data URIs

#### Scenario: Different seeds vary the art

- **WHEN** the generator is called with two different seeds
- **THEN** the returned URIs differ (shape layout, palette, and/or color assignment), and each carries the background of one of the module's palettes

### Requirement: An imageless item SHALL materialize a persisted placeholder on first view

A guest-callable server action (`mintItemPlaceholder(itemId)`) SHALL, for an item the caller is authorized to view (per `isItemViewable`, the same gate the guest-callable purchase paths use):

- when the item has no `item_images` row resolving as active, generate art with **seed = item id**, insert it as an `item_images` row flagged `active`, call `updateTag('items')`, and return the URI;
- when the item already resolves an active image (real or placeholder), return that state without inserting and without calling `updateTag`;
- when the caller is not authorized to view the item, reject with `{ success: false, error: 'Unauthorized' }` with no write and no cache invalidation (per `server-endpoint-authorization`).

The action's payload SHALL carry no identity or content fields beyond the item id — the stored art is fully server-derived. Concurrent first views race the check-then-insert (no transactions on the neon-http driver); the `item_images_one_active_idx` partial-unique index (at most one active row per item) SHALL backstop the race — the mint insert uses `ON CONFLICT DO NOTHING`, and a losing call SHALL re-read and return the winner's row instead of inserting a second active row.

#### Scenario: First view of an imageless item mints and persists

- **WHEN** any viewer (guest or authenticated) first views an imageless item they are authorized to see
- **THEN** the action inserts one active placeholder `item_images` row seeded by the item id, bumps the `items` tag, and subsequent reads resolve the placeholder as the item's image

#### Scenario: Mint is idempotent on an already-imaged item

- **WHEN** `mintItemPlaceholder` is called for an item that already resolves an active image
- **THEN** no row is inserted and no cache tag is invalidated

#### Scenario: Unauthorized mint is rejected without side effects

- **WHEN** a caller invokes `mintItemPlaceholder` for an item on a list they cannot view
- **THEN** the action returns `{ success: false, error: 'Unauthorized' }` with no database write and no cache invalidation

### Requirement: ItemPhoto's empty state SHALL trigger the mint and swap in the art

When `ItemPhoto` renders with no image URL, it SHALL fire the mint action from a client effect and render the returned URI in place on response — the existing empty container shows until the response arrives (a one-time flash per item). When an image URL is present, `ItemPhoto` SHALL render it exactly as today with no mint call. No placeholder generation SHALL happen in the client bundle.

#### Scenario: Empty container swaps to art on mint response

- **WHEN** `ItemPhoto` mounts for an imageless item
- **THEN** the empty container renders first, the mint action is called once, and the returned placeholder art renders in the container on response

#### Scenario: Imaged items never call the mint

- **WHEN** `ItemPhoto` mounts with a non-empty image URL
- **THEN** no mint action is invoked

### Requirement: A dead saved image URL SHALL fall back to render-only placeholder art

When `ItemPhoto` renders a saved image URL and the image fails to load (`onError` — rotted CDN link, hotlink block), it SHALL request fallback art from a transient server action and swap it into the container render-only. The action SHALL gate on the caller's authorization to view the item (`isItemViewable`, the same gate the mint uses), return `generatePlaceholderArt(itemId)`, and perform zero database writes — client `onError` cannot distinguish permanent link rot from a transient glitch, so the saved URL is never overwritten and the next page load retries it. The deterministic itemId seed keeps the fallback art identical to minted art and stable across repeated failures. The fallback SHALL be requested at most once per mount, and only for the saved-URL path (minted art is a data URI and cannot fail to load).

#### Scenario: Dead link swaps to art without a write

- **WHEN** a saved item-image URL fires `onError`
- **THEN** the fallback action is called once, its deterministic art renders in the existing image container, and no `item_images` row is inserted, updated, or deleted

#### Scenario: Next load retries the saved URL

- **WHEN** the item is rendered again after a fallback swap
- **THEN** the saved URL is attempted again — the fallback never persists

### Requirement: The deck SHALL obtain transient placeholder previews from a server action

An authenticated-only server action SHALL generate `n` placeholder previews from distinct random seeds and return their URIs without persisting anything — the deck photo card's placeholder thumbs and the reroll control consume it (reroll = a fresh call for one). Only a **selected** preview is ever persisted — a user pick, or the default pre-selection of the first placeholder on a zero-real-photo strip (per `item-decision-deck`) — and that happens through the normal item save path, not this action.

#### Scenario: Previews are transient

- **WHEN** the deck requests placeholder previews and the user saves the item having selected a real photo instead
- **THEN** no placeholder URI from that preview set exists anywhere in `item_images`
