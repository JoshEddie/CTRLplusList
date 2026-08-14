# item-placeholder-art Delta

## MODIFIED Requirements

### Requirement: The deck SHALL obtain transient placeholder previews from a server action

An authenticated-only server action SHALL generate `n` placeholder previews from distinct random seeds and return their URIs without persisting anything — the deck photo card's placeholder thumbs and the reroll control consume it (reroll = a fresh call for one). Only a **selected** preview is ever persisted — a user pick, or the default pre-selection of the first placeholder on a zero-real-photo strip (per `item-decision-deck`) — and that happens through the normal item save path, not this action.

#### Scenario: Previews are transient

- **WHEN** the deck requests placeholder previews and the user saves the item having selected a real photo instead
- **THEN** no placeholder URI from that preview set exists anywhere in `item_images`
