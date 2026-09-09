# List-item order uses sparse integer fractional indexing

Positions are assigned on a 65536 stride and a move writes the midpoint between
its neighbours, with a lazy rebalance when the gap closes. Contiguous `0..n`
positions were the alternative and would need N updates per move — which, under
[0001](0001-no-interactive-database-transactions.md), means N non-atomic writes
with no way to roll back a partial reorder.

Every move is pairwise, including the ones the reorder surface makes: a drop
and an arrow press both name the row moved past, so each is one write of one
position rather than a rewrite of the whole list.
