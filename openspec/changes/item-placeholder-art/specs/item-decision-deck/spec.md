# item-decision-deck (delta)

## MODIFIED Requirements

### Requirement: The photo card SHALL show whenever there is a choice or a problem

The photo step SHALL always be shown — placeholder art means every flow now carries a real choice (fetched images vs generated placeholders), so the former exactly-one-image bypass is removed and the intro card's remaining-step count SHALL always include the photo pick:

- **One or more images:** the `photo` card SHALL present a primary stage with previous/next navigation, a selectable thumbnail strip with a visible selected state, and an "add image by URL" affordance. With exactly one fetched image, that image SHALL still be pre-selected as active so accepting the default costs one advance.
- **Zero images:** the `photo` card SHALL render the same stage + strip presentation seeded entirely with placeholder thumbs (no "couldn't find any images" dead end); the add-by-URL affordance remains. The user MAY still proceed with no image selected (a null image is permitted by the model; the lazy-mint path of `item-placeholder-art` covers the saved item).

The thumbnail strip SHALL append `max(1, 4 − realPhotos)` **transient placeholder thumbs** after the real candidates, each generated from a distinct random seed via the preview action owned by `item-placeholder-art` (0 real → 4 placeholder thumbs, 1 → 3, 2 → 2, 3 or more → 1; a placeholder option always exists). Placeholder thumbs are distinguishable by their generated-art appearance itself (no additional badge or marker), SHALL never be persisted unless selected, and SHALL NOT count toward the candidate cap owned by `item-image-candidates`.

While a placeholder thumb is the current selection — and only then — the stage SHALL show a **reroll** control (a `button-system` button) that regenerates that thumb in place with a fresh random seed; rerolling SHALL NOT reorder the strip or change any other thumb.

Undersized candidates SHALL be pruned from display following the existing item-image-candidates behavior, while the active and main images remain visible; placeholder thumbs are never pruned. The selected photo (real or placeholder) SHALL become the active image on save. Every photo control (stage nav, thumbnails, add, reroll) SHALL meet the 44px touch-target floor or the documented small/link exception.

#### Scenario: Single image no longer bypasses the selector

- **WHEN** a fetch returns exactly one image
- **THEN** the photo card SHALL appear with that image pre-selected on the stage, the strip holding the real thumb plus three placeholder thumbs, and the intro's remaining-step count including the photo pick

#### Scenario: Zero images seeds an all-placeholder strip

- **WHEN** a fetch returns no images
- **THEN** the photo card SHALL appear with four placeholder thumbs and the add-by-URL affordance, and the user MAY select a placeholder or proceed with no image

#### Scenario: Selecting a thumbnail updates the active photo

- **WHEN** the user activates a thumbnail other than the current one
- **THEN** that image SHALL become selected and be shown on the stage, and SHALL be the active image when the item is created

#### Scenario: Adding a photo by URL appends and selects it

- **WHEN** the user pastes a valid image URL into the add affordance and confirms
- **THEN** the URL SHALL be appended to the candidate pool and selected

#### Scenario: Reroll regenerates only the selected placeholder

- **WHEN** a placeholder thumb is selected and the user activates the reroll control
- **THEN** that thumb SHALL be replaced in place by art from a fresh random seed, the strip order and other thumbs SHALL be unchanged, and the reroll control SHALL NOT render while a real photo is selected

#### Scenario: Unselected placeholder thumbs leave no trace

- **WHEN** the user saves the item with a real photo selected
- **THEN** none of the placeholder preview URIs are persisted
