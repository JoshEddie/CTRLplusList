## ADDED Requirements

### Requirement: The owner/manager role matrix SHALL be covered by an end-to-end manager flow

The repository SHALL maintain a Playwright spec covering the role matrix from a `manager`'s seat, extending the covered-flows list the management-flow requirement enumerates. The spec SHALL assert **both** halves of the matrix — that a manager may do what their role admits, and that they are refused what it does not — because a spec covering only the permission proves nothing about the narrowing, and one covering only the refusal cannot distinguish a working floor from a broken surface.

The spec SHALL start by pinning its browser context to a seeded profile the viewer holds a `manager` membership on, by setting the application's own selection cookie, per the mechanism the management-flow requirement fixes. It SHALL drive real user-visible affordances and assert observable outcomes.

Coverage of the refused half SHALL assert the state, not only the surface: after the manager has been shown the disabled affordance, a reload SHALL show the target unchanged, so a surface that quietly wrote anyway cannot pass.

The refusal SHALL NOT be driven by tampering with the disabled control from the test. Every owner-floor affordance guards its own handler, so a browser cannot reach the action past one; a spec that forces the DOM proves only that the forcing failed. That the server and not the control is the enforcement is pinned where it is actually observable — the unit coverage of the shared gate's floor and of each administrative action — and this requirement covers the surface and the state it leaves behind.

The seeded fixtures already supply both seats — a profile the viewer owns and one they manage — so this flow SHALL NOT require new seed rows.

#### Scenario: A manager exercises the writes their role admits

- **WHEN** the suite, acting as a profile the viewer manages, creates items, edits one, creates a list, attaches them to it, and archives one
- **THEN** each step's observable result renders

Item ordering is deliberately not among them: reordering is a drag, and a drag cannot be driven from this harness. Its write takes the same floor as the steps above, and is covered where the gesture is not in the way.

#### Scenario: A manager is refused an owner-floor write at the surface

- **WHEN** the suite, acting as a profile the viewer manages, opens a surface carrying an owner-floor affordance
- **THEN** that affordance renders in a disabled state rather than being absent

#### Scenario: A manager's disabled affordance leaves no state change

- **WHEN** the suite, acting as a profile the viewer manages, opens a surface carrying an owner-floor affordance and reloads it
- **THEN** the affordance is still disabled and the target it would have changed is unchanged

#### Scenario: An owner sees the same surface operable

- **WHEN** the suite switches to a profile the viewer owns and opens the equivalent surface
- **THEN** the owner-floor affordances are operable

#### Scenario: Dropping the manager flow fails the suite

- **WHEN** a future change removes or skips the spec covering the manager-role flow
- **THEN** the corresponding e2e coverage is absent and this requirement is violated

### Requirement: Admission SHALL be covered end to end across both accounts

The repository SHALL maintain a Playwright spec covering the invite round trip: an owner mints a link, a different account redeems it and gains the role it grants, and the same link is refused a second time. Admission is the one flow whose two ends are necessarily two people, so a spec driven from a single seat cannot cover it.

The auth bypass admits one account per server process, so the recipient SHALL be a seeded identity with a server of its own, reached by absolute URL from the minting seat rather than by a second Playwright project — a test belongs to one project, and this flow spans both ends.

The spec SHALL assert the roster's side of the round trip as well as the recipient's: the minted link appears as a pending row, and a redemption replaces it with the member it admitted.

#### Scenario: The suite covers a link from minting to refusal

- **WHEN** the suite mints a link as an owner, redeems it as another seeded account, and opens the same link again
- **THEN** the redeeming account holds the role the link granted, and the second attempt is refused

#### Scenario: Dropping the admission flow fails the suite

- **WHEN** a future change removes or skips the spec covering the invite round trip
- **THEN** the corresponding e2e coverage is absent and this requirement is violated
