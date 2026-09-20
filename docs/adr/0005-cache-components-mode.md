# `cacheComponents: true`

The app runs Next's `cacheComponents` mode, which is what makes the `'use cache'`
read layer and the tag contract in [0004](0004-narrow-tag-invalidation-contract.md)
possible. It also forbids things that otherwise look arbitrary: a cached function
may not read cookies (so `getUserIdentity` uses React `cache()` instead),
`Date.now()` is unavailable in server components (hence the static
`BYPASS_EXPIRES`), prerender aborts must be re-thrown via `unstable_rethrow`, and
some routes need `export const instant = false`.

Turning it off would mean rewriting every cached read and every Suspense
boundary.
