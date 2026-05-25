## ADDED Requirements

### Requirement: Archive and Delete affordances on an item SHALL communicate distinct semantics

The item edit/detail surface and any inline item row affordance SHALL expose Archive and Delete as visually and copy-wise distinct actions whose user-visible semantics are unambiguous:

- **Archive** SHALL be presented as non-destructive: the item is hidden from the owner's `/items` (Active tab) and from the choose-items picker, but the item row, all `list_items` associations, all `item_stores` rows, and all `purchases` SHALL be preserved (`items.archived_at` is set to a timestamp; no rows are deleted). The archived item continues to appear on every list it is currently attached to — archive does NOT remove the item from shared list views. Archive is a one-click toggle with a toast confirmation; no modal dialog is presented.
- **Delete** SHALL be presented as destructive: the item row, all `list_items` associations, all `item_stores` rows, and all `purchases` rows for that item are removed via FK cascade. The affordance SHALL communicate this through (a) destructive visual styling (the `danger` button variant), AND (b) a confirmation dialog that names the consequence and irreversibility in plain language.

The two affordances SHALL NOT be visually identical or share helper copy that conflates their semantics. A user encountering both affordances for the first time SHALL be able to distinguish "this hides the item" from "this permanently destroys it" without reading source code or DB schema.

#### Scenario: Archive shows no confirmation dialog

- **WHEN** an authenticated user activates the Archive affordance on one of their items
- **THEN** the action is performed immediately, a success toast confirms the archival, and `items.archived_at` is set; no modal dialog is presented

#### Scenario: Archived item can be restored

- **WHEN** a user views an archived item and activates the Unarchive affordance
- **THEN** `items.archived_at` is cleared and the item reappears in `/items` Active tab and the choose-items picker; all preserved associations (lists, stores, purchases) remain intact

#### Scenario: Archive and Delete are visually distinct

- **WHEN** an item edit view renders both Archive and Delete affordances (Archive on the list row via item kebab; Delete on the edit form footer)
- **THEN** the Delete affordance uses the `danger` button variant and the Archive affordance does not

### Requirement: The Delete confirmation dialog SHALL nudge the user toward Archive without obstructing Delete

When an owner activates Delete on an item, the confirmation dialog SHALL surface Archive as a recoverable alternative AND preserve the original Delete affordance's tap target and visual prominence, so the user is informed of the alternative without bait-and-switch on the action they just chose.

The dialog SHALL use a single anchor metaphor — "history" — to convey what Archive preserves and Delete erases, in place of enumerating individual data consequences (claims, list memberships, store links). The copy SHALL NOT branch on claim count or claim ownership.

The dialog SHALL render three buttons when the item is active (not archived):

- **Cancel** — ghost variant, dismisses the dialog.
- **Archive instead** — primary variant, full-width above the Cancel | Delete row. Selecting it archives the item and dismisses the dialog.
- **Delete** — danger variant, in the bottom row alongside Cancel. Selecting it deletes the item permanently.

When the item is already archived, the dialog SHALL render only Cancel and Delete (no Archive instead — the alternative is no longer meaningful).

#### Scenario: Active item — confirmation dialog offers Archive as recoverable alternative

- **WHEN** an authenticated owner clicks Delete on the edit form for an active (non-archived) item
- **THEN** a confirmation dialog renders with:
  - Title: "Delete this item?"
  - Body: "Archive instead to keep its history. Deleting can't be undone."
  - Buttons: a full-width "Archive instead" (primary) above a Cancel | Delete row

#### Scenario: Active item — selecting "Archive instead" archives without deleting

- **WHEN** the user clicks "Archive instead" in the confirmation dialog
- **THEN** the item's `archived_at` is set, a success toast appears, the dialog dismisses, and no rows are deleted

#### Scenario: Already-archived item — confirmation dialog omits the Archive option

- **WHEN** an authenticated owner clicks Delete on the edit form for an item whose `archived_at` is set
- **THEN** a confirmation dialog renders with:
  - Title: "Delete this item permanently?"
  - Body: "This erases its history. Can't be undone."
  - Buttons: Cancel and Delete only (no "Archive instead")

#### Scenario: Copy uses "history" anchor, not claim/list enumeration

- **WHEN** the confirmation dialog renders for any item
- **THEN** the body copy SHALL use the word "history" to convey what Archive preserves and Delete erases, and SHALL NOT enumerate claim counts, list memberships, or store-link counts in the body
