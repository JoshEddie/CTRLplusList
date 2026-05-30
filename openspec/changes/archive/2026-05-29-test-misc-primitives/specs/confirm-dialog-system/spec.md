## ADDED Requirements

### Requirement: ConfirmDialog SHALL be a controlled modal that renders nothing when closed

The `<ConfirmDialog>` primitive at `app/ui/components/ConfirmDialog.tsx` SHALL render nothing (no overlay, no content, no buttons, no portal residue) when its `isOpen` prop is falsy. When `isOpen` is truthy, it SHALL render an overlay `<div class="confirm-dialog-overlay">` containing a content `<div class="confirm-dialog-content">` with a title `<h3 class="confirm-dialog-title">`, a message `<p class="confirm-dialog-message">`, and a button row `<div class="confirm-dialog-buttons">`. The `isOpen` and `onClose` props together encode the controlled-modal contract: consumers own the open state, and the dialog notifies the consumer via `onClose` when an internal action requests dismissal.

#### Scenario: isOpen false renders nothing

- **WHEN** `<ConfirmDialog isOpen={false} onClose={fn} onConfirm={fn} title="t" message="m" />` is rendered
- **THEN** no overlay or content element is present in the DOM
- **AND** no buttons are queryable from the rendered output

#### Scenario: isOpen true renders overlay, content, title, message, and buttons

- **WHEN** `<ConfirmDialog isOpen={true} onClose={fn} onConfirm={fn} title="Delete?" message="Are you sure?" />` is rendered
- **THEN** an element with class `confirm-dialog-overlay` is present, containing an element with class `confirm-dialog-content`
- **AND** an `<h3>` with class `confirm-dialog-title` contains the text `"Delete?"`
- **AND** a `<p>` with class `confirm-dialog-message` contains the text `"Are you sure?"`
- **AND** a button-row container with class `confirm-dialog-buttons` is present

#### Scenario: Message accepts ReactNode

- **WHEN** `<ConfirmDialog isOpen={true} ... message={<span data-testid="x">hi</span>} />` is rendered
- **THEN** the message paragraph contains the child element (the `data-testid="x"` span is reachable inside `.confirm-dialog-message`)

### Requirement: ConfirmDialog button row SHALL have fixed order and fixed Cancel/Confirm variants

When the dialog is open, the button row SHALL contain exactly three buttons in DOM order — tertiary (when provided), then Cancel, then Confirm — OR exactly two buttons in DOM order — Cancel, then Confirm — when no tertiary is provided. The Cancel button SHALL be rendered with `variant="ghost"`. The Confirm button SHALL be rendered with `variant="danger"`. Consumers SHALL NOT override the Cancel or Confirm variants — the primitive enforces the design-system contract that destructive actions are always rightmost and danger-styled. The optional `tertiary.variant` SHALL accept only `'primary' | 'secondary'` and SHALL default to `'primary'` when not provided.

#### Scenario: No tertiary renders two buttons

- **WHEN** `<ConfirmDialog>` is rendered without a `tertiary` prop
- **THEN** the button row contains exactly two buttons
- **AND** the buttons in DOM order are Cancel then Confirm

#### Scenario: With tertiary renders three buttons in order

- **WHEN** `<ConfirmDialog>` is rendered with `tertiary={{ label: 'Keep', onClick: fn }}`
- **THEN** the button row contains exactly three buttons
- **AND** the buttons in DOM order are tertiary (label "Keep"), Cancel, Confirm

#### Scenario: Tertiary variant defaults to primary

- **WHEN** `<ConfirmDialog>` is rendered with `tertiary={{ label: 'Keep', onClick: fn }}` (no `variant`)
- **THEN** the tertiary button is rendered through `<Button variant="primary">`

#### Scenario: Tertiary explicit secondary variant

- **WHEN** `<ConfirmDialog>` is rendered with `tertiary={{ label: 'Keep', onClick: fn, variant: 'secondary' }}`
- **THEN** the tertiary button is rendered through `<Button variant="secondary">`

#### Scenario: Cancel button uses ghost variant

- **WHEN** `<ConfirmDialog>` is rendered
- **THEN** the Cancel button is rendered through `<Button variant="ghost">`

#### Scenario: Confirm button uses danger variant

- **WHEN** `<ConfirmDialog>` is rendered
- **THEN** the Confirm button is rendered through `<Button variant="danger">`

### Requirement: ConfirmDialog action buttons SHALL auto-dismiss via composition with onClose

Clicking the Cancel button SHALL invoke `onClose()` exactly once and SHALL NOT invoke `onConfirm` or `tertiary.onClick`. Clicking the Confirm button SHALL invoke `onConfirm()` AND then `onClose()` in that order, in the same React event tick. Clicking the tertiary button (when provided) SHALL invoke `tertiary.onClick()` AND then `onClose()` in that order, in the same React event tick. The auto-dismiss contract means consumers do not need to manually close the dialog after a successful action — the dialog closes itself.

#### Scenario: Cancel click invokes onClose only

- **WHEN** the Cancel button is clicked
- **THEN** the `onClose` spy is called exactly once
- **AND** the `onConfirm` spy is NOT called
- **AND** the `tertiary.onClick` spy (when provided) is NOT called

#### Scenario: Confirm click invokes onConfirm then onClose in order

- **WHEN** the Confirm button is clicked
- **THEN** the `onConfirm` spy is called exactly once
- **AND** the `onClose` spy is called exactly once
- **AND** the `onConfirm` invocation precedes the `onClose` invocation (verified via spy invocation-call-order)

#### Scenario: Tertiary click invokes tertiary.onClick then onClose in order

- **WHEN** the tertiary button is clicked
- **THEN** the `tertiary.onClick` spy is called exactly once
- **AND** the `onClose` spy is called exactly once
- **AND** the `tertiary.onClick` invocation precedes the `onClose` invocation

### Requirement: ConfirmDialog confirmText and cancelText SHALL default to "Confirm" and "Cancel"

The `confirmText` prop SHALL default to the string `"Confirm"` when not provided. The `cancelText` prop SHALL default to the string `"Cancel"` when not provided. Consumers MAY override either via the prop to surface action-specific labels (e.g. `confirmText="Delete"`). The tertiary's `label` is required (no default).

#### Scenario: Confirm text defaults to Confirm

- **WHEN** `<ConfirmDialog>` is rendered without `confirmText`
- **THEN** the Confirm button's accessible name is `"Confirm"`

#### Scenario: Cancel text defaults to Cancel

- **WHEN** `<ConfirmDialog>` is rendered without `cancelText`
- **THEN** the Cancel button's accessible name is `"Cancel"`

#### Scenario: Confirm text override

- **WHEN** `<ConfirmDialog confirmText="Delete">` is rendered
- **THEN** the Confirm button's accessible name is `"Delete"`

#### Scenario: Cancel text override

- **WHEN** `<ConfirmDialog cancelText="Keep">` is rendered
- **THEN** the Cancel button's accessible name is `"Keep"`

#### Scenario: Tertiary label is rendered inside the tertiary button

- **WHEN** `<ConfirmDialog tertiary={{ label: 'Move to trash', onClick: fn }}>` is rendered
- **THEN** the tertiary button's accessible name is `"Move to trash"`
