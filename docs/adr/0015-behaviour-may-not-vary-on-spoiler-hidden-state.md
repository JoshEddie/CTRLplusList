# Behaviour may not vary observably on spoiler-hidden state

A viewer held below the `claims` tier must not be able to infer that a claim
exists from how the app *behaves* — a refused action, a differently-worded
confirmation, an entry that lingers where an unclaimed one would vanish.
Spoiler tiers gate claim *content*; this extends the same gate to mechanism,
because a difference in behaviour is itself a disclosure. Gating only the data
payload was the alternative — it is where the tier machinery naturally sits —
and it leaves every branch on claim state as an open channel.

**Consequences:** a feature whose safe implementation depends on telling the
owner "you cannot do that, someone has claimed it" is not implementable as
stated; it must either behave identically in both cases, or surface the
difference only above `claims`.

Only one part of the app actively enforces this. An owner below `claims` who
opens Add claim or Manage claim is routed through `setPendingReveal` into a
"This could spoil a surprise" confirmation, worded differently depending on
whether the count or the claimers' names would be exposed — the disclosure is
gated on consent rather than suppressed. `isFullyClaimed` is the other
deliberate instance: derived from the sanitized purchase array, so a `progress`
viewer sees a fully-claimed item as claimable and the sold-out treatment never
appears.

Everywhere else the principle holds because nothing branches on claim state at
all. That is the absence of a violation, not the presence of a guard: there is
no lint, no type, and no wrapper that would catch a new branch. A future change
that varies behaviour on hidden claim state will pass every gate this repo has.
