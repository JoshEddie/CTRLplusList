# Behaviour may not vary observably on spoiler-hidden state

A viewer held below the `claims` tier must not be able to infer that a claim
exists from how the app _behaves_ — a refused action, a differently-worded
confirmation, an entry that lingers where an unclaimed one would vanish.
Spoiler tiers gate claim _content_; this extends the same gate to mechanism,
because a difference in behaviour is itself a disclosure. Gating only the data
payload was the alternative — it is where the tier machinery naturally sits —
and it leaves every branch on claim state as an open channel.

**Consequences:** a feature whose safe implementation depends on telling the
owner "you cannot do that, someone has claimed it" is not implementable as
stated; it must either behave identically in both cases, or surface the
difference only above `claims`.

Only one part of the app actively enforces this. A viewer below `claims` who
opens Add claim is routed through `setPendingReveal` into a "This could spoil a
surprise" confirmation before the count and the remaining capacity are fetched
— the disclosure is gated on consent rather than suppressed. The owner's
Manage claims carries the other confirmation, the one that promises names; it
asks whenever another party is on the item or the count is withheld, never on a
row that arrived without a name, so it varies on nothing the viewer's own tier
conceals from them. A claim-holder's Manage claim asks nothing at any tier: it
opens on rows they hold, which every tier discloses.

Two instances are deliberate. `isFullyClaimed` is derived from the entry's
claimed-unit count, which the read withholds below `claims` alongside the claims
themselves — so a `progress` viewer sees a fully-claimed item as claimable and
the sold-out treatment never appears. The claim banner is the other: it is a
button carrying a facepile exactly where the entry has at least one claim at the
`claims` tier, and the `role="status"` readout it has always been everywhere
else — at zero claims, below `claims`, and on the library card, whose totals
name no single entry. The branch is the count the banner already states out
loud: a viewer reading `2 of 3 claimed` learns nothing further from the banner
also being pressable, and one held below it reads `3 wanted` on a claimed and an
unclaimed entry alike.

Everywhere else the principle holds because nothing branches on claim state at
all. That is the absence of a violation, not the presence of a guard: there is
no lint, no type, and no wrapper that would catch a new branch. A future change
that varies behaviour on hidden claim state will pass every gate this repo has.
