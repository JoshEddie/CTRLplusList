# Claimed units are summed, not stored

Capacity reads `SUM(purchases.units)` over the list entry rather than a
`claimed_units` column beside it. A counter the write path gates on is a second
answer to a question the claim rows already answer, and
[ADR-0001](0001-no-interactive-database-transactions.md) leaves no primitive to
hold the two equal, so nothing in the schema can say which side is right when
they disagree. #359 specified the counter for the atomic capacity check it
allows; that check is not worth a number that can be quietly wrong. The snapshot
columns on a claim are not the same shape — they record what the item was at
claim time, which no current source reproduces, so they track nothing.

**Consequences:** capacity becomes a guard folded into the claim insert, taking
no lock and leaving the residual race [docs/database.md](../database.md)
describes — accepted because an over-claimed entry is already legal per #359,
and `purchase.actions.ts` documents the same race today.
