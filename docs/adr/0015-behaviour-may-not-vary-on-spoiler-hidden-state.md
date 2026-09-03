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

Three parts of the app actively enforce this. An owner below `claims` who
opens Add claim or Manage claim is routed through `setPendingReveal` into a
"This could spoil a surprise" confirmation, worded differently depending on
whether the count or the claimers' names would be exposed — the disclosure is
gated on consent rather than suppressed. `isFullyClaimed` is the second
deliberate instance: derived from the entry's claimed-unit count, which the
read withholds below `claims` alongside the claims themselves — so a `progress`
viewer sees a fully-claimed item as claimable and the sold-out treatment never
appears.

Soft removal is the third, and the one where the *mechanism* rather than a
payload is what had to be gated. Removing an item from a list deletes the entry
when it carries no claims and keeps it hidden when it does, so the surviving
ghost states that somebody has claimed. `getItemsByListId` therefore withholds
it from its own owner below `claims`, and `getItemById` — which is cached per
item and has no tier to consult — withholds it from every reader; the two
together are what make removal look identical to a protected owner whether or
not the entry was claimed. The people the entry survives for reach it by
holding a claim on it, which is not a tier question at all.

Everywhere else the principle holds because nothing branches on claim state at
all. That is the absence of a violation, not the presence of a guard: there is
no lint, no type, and no wrapper that would catch a new branch. A future change
that varies behaviour on hidden claim state will pass every gate this repo has.
