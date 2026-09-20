# Deferred `after()` writes bypass the DAL

Visit stamping and follow-feed seen-marking run inside `after()` and query
`@/db` directly from the component, rather than calling a server action. Next 16
disallows `headers()`/`cookies()` inside `after()`, so the deferred closure
cannot call `auth()`; the request state it needs is captured into a local
beforehand. `updateTag` also throws inside `after()`, so these writes fire no
tags — which is safe only because every reader of the columns they touch is
uncached.

This is the sole sanctioned exception to routing all data access through
`lib/data/`.
