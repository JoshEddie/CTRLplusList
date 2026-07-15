## Context

`ItemFormContainer.body()` is the item-form's screen router: every branch it returns becomes the root element rendered under `<FormShell>`'s chrome. Padding is authored per-screen in `deck.css`, and the authorship is incomplete:

| Screen | Root class | Padding today |
| --- | --- | --- |
| UrlEntryStep, Deck | `.deck` | `8px 24px 24px` |
| FetchFailure | `.deck-failure` | `8px 24px 24px` |
| Preview | `.deck-preview` | `18px 24px` |
| FetchingStep | `.prefill-fetching-step` | `32px 24px 0` |
| Triage | `.deck-triage` | none |
| FocusEditor | `.deck-focus` | none |
| Stores/Lists sheet | `.deck-sheet` | none |

`.deck-triage`, `.deck-focus`, and `.deck-sheet` appear in `deck.css` only inside the shared flex block (`display: flex; flex-direction: column; gap: 16px`), which carries no padding. Three screens render flush.

Constraint from `form-shell-system`: the `<FormShell>` inner div renders `form-shell-hd` and then children directly — the spec fixes this DOM. There is no shell-level body element to pad.

## Goals / Non-Goals

**Goals:**

- Fix the three flush screens.
- Make root-screen padding structurally opt-in, so the omission that caused this bug cannot recur silently.
- One home for the value.

**Non-Goals:**

- Retuning any padding value. `8px 24px 24px` is today's majority value and is preserved exactly.
- Normalizing `.deck-preview` or `.prefill-fetching-step` onto the shared value — their values are deliberate.
- Any behavior change, or any change to `FormShell` / `form-shell-system`.

## Decisions

### Shared class in markup, not a CSS group selector

`.deck-body` carries the padding; each root opts in via `className`.

Rejected: a group selector (`.deck, .deck-triage, .deck-focus, .deck-sheet, .deck-failure { padding: … }`). It is a smaller diff and touches no TSX, but membership stays invisible from the JSX — a future screen is unpadded until someone remembers to edit a selector in another file. That is exactly the failure mode being fixed, re-expressed. The class makes a reader of any root see the opt-in, and makes omission visible at the call site.

Rejected: leaving per-screen authorship and adding a third copy of the literal. `8px 24px 24px` would reach three copies, and CLAUDE.md's DRY rule extracts at three even for trivial units.

### `deck-body` carries the shared flex block too, not padding alone

The five padded roots were already the bulk of the shared flex block's membership (`display: flex; flex-direction: column; gap: 16px`). Once `deck-body` marks exactly that set, listing them again by their own names is a second spelling of the same membership — so the block's members become `.deck-body` plus the four surfaces that are deliberately *not* `deck-body`: `.deck-card`, `.deck-preview`, `.deck-stores`, `.deck-lists`.

The consequence is that `.deck`, `.deck-triage`, `.deck-focus`, and `.deck-sheet` lose their last CSS rule. They stay in the markup as semantic screen markers — the DOM should still name which screen it is for devtools and future styling — but they style nothing today. `.deck-failure` keeps its own rule (`align-items`, `text-align`) and so remains live.

Rejected: keeping the long member list beside `deck-body`. It duplicates the membership in two places, and the two could drift — a screen added to one list and not the other is exactly this change's original bug in a new costume.

### Padding stays on the screen roots, not in `FormShell`

Rejected: adding a padded body wrapper inside `FormShell`, which would fix all screens at once and need no per-screen class. Two blockers. `form-shell-system` fixes the shell's DOM by spec — children render directly after the header — so this is a modification to a second capability, not a free win. And `FormShell` is a shared primitive with non-deck callers, while Preview and Fetching deliberately want different values; a shell-level default would have to be fought off by two screens immediately.

### Membership is "root screens only"

The six members are the elements `body()` returns as roots: `.deck` (×2 call sites), `.deck-triage`, `.deck-focus`, `.deck-sheet`, `.deck-failure`.

`.deck-card`, `.deck-stores`, and `.deck-lists` look unpadded but are correct as-is — they nest inside `.deck` and `.deck-sheet` respectively and inherit the root's padding. Giving them the class would double-pad. This is the one live hazard in the change, and the spec delta names it explicitly.

`.deck-preview` and `.prefill-fetching-step` are roots but keep their own values, so they do not take the class. `.deck-preview`'s rule also carries `container-type: inline-size`, which the shared class must not disturb.

### Name: `deck-body`

The class marks the region below the shell chrome. `-body` is already this codebase's word for that region: `form-shell-hd` / `form-shell-ft` bracket it, and `deck-card-body`, `deck-sheet-body`, `deck-preview-body` already exist in `deck.css`.

Rejected: `deck-info` — the region also holds Continue/Done and the action rows, so "info" claims a content type it does not keep. Rejected: `deck-screen`, `deck-pad` — accurate but introduce vocabulary where `-body` already serves.

### No new automated test

jsdom loads no CSS, so a unit test cannot assert computed padding. An e2e computed-padding assertion would pin a magic pixel value and break on any future design retune. Verification is a click-test on the dev deployment via `product-fetch-mock` (`https://mock.test/success` in local mode), which exists for this defect class by its own Purpose. The five standing gates still run.

## Risks / Trade-offs

- **A root gets the class while nested inside another padded root → double padding.** → Membership is spec'd as roots-only with the three nested surfaces named; the six call sites are enumerated in tasks and are individually visible in review.
- **`.deck` serves two call sites (Deck, UrlEntryStep); missing one leaves a screen flush.** → Both are enumerated; removing `.deck`'s own padding rule means a miss is immediately visible on the screen rather than silent.
- **A future screen still forgets the class.** → Reduced, not eliminated: the failure is now a visible missing class at the call site instead of an absent rule in a distant file. The spec delta makes it reviewable.
- **Class-based padding is weaker than a `body()`-level wrapper that could enforce it structurally.** → Accepted; the wrapper is blocked by `form-shell-system` and by Preview/Fetching's divergent values.
