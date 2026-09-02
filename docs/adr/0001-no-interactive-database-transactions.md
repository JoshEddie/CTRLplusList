# No interactive database transactions

The `neon-http` driver runs every query as its own HTTP round-trip, so
`db.transaction(...)` and `SELECT … FOR UPDATE` cannot hold a session open
across statements. Atomicity comes instead from unique and partial-unique
indexes plus `ON CONFLICT`, and from folding multi-step writes into a single
CTE. A pooled driver would restore transactions at the cost of the serverless
connection model the deployment target depends on.
