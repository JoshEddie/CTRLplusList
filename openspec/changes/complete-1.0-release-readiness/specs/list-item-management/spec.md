## ADDED Requirements

### Requirement: Archive and Delete affordances on an item SHALL communicate distinct semantics

The item edit/detail surface (`/items/[id]`) and any inline item row affordance SHALL expose Archive and Delete as visually and copy-wise distinct actions whose user-visible semantics are unambiguous:

- **Archive** SHALL be presented as non-destructive: the item is hidden from the user's primary library views and from active list rendering, but the item row, its purchase history, and any claims by other users SHALL be preserved in the database (`items.archived_at` is set to a timestamp; no rows are deleted). The affordance SHALL communicate this to the user either through its label ("Hide from list", "Archive") and a one-line description ("Keeps purchase history; can be restored later"), OR through a tooltip/helper text adjacent to the affordance that conveys the same.
- **Delete** SHALL be presented as destructive: the item row, all `list_items` associations, all `item_stores` rows, and all `purchases` rows for that item are removed (or cascaded). The affordance SHALL communicate this through (a) destructive visual styling (red text or destructive-button variant), AND (b) a confirmation dialog that names the consequence in plain language ("This will permanently delete this item and all purchase records. This cannot be undone.").

The Archive affordance SHALL NOT show a confirmation dialog by default (it is reversible by un-archiving); the Delete affordance SHALL always show a confirmation dialog.

The two affordances SHALL NOT be visually identical or share helper copy that conflates their semantics. A user encountering both affordances for the first time SHALL be able to distinguish "this hides the item" from "this permanently destroys it" without reading source code or DB schema.

#### Scenario: Archive shows no confirmation dialog

- **WHEN** an authenticated user activates the Archive affordance on one of their items
- **THEN** the action is performed immediately, a success toast confirms the archival, and `items.archived_at` is set; no modal dialog is presented

#### Scenario: Delete shows a confirmation dialog naming the consequence

- **WHEN** an authenticated user activates the Delete affordance on one of their items
- **THEN** a confirmation dialog is presented containing copy that names what will be deleted (the item AND its purchase records) and warns it cannot be undone; the deletion only proceeds after the user confirms

#### Scenario: Archive and Delete are visually distinct

- **WHEN** an item edit view renders both Archive and Delete affordances
- **THEN** the Delete affordance uses destructive styling (e.g. the destructive button variant or red text) and the Archive affordance does not; helper copy on each affordance describes a different outcome

#### Scenario: Archived item can be restored

- **WHEN** a user views an archived item and activates the inverse affordance ("Un-archive", "Restore", or whatever the inverse label is)
- **THEN** `items.archived_at` is cleared and the item reappears in active library views; the purchase history is preserved (it was never lost)
