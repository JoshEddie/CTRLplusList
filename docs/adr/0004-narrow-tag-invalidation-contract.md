# Invalidation is a narrow-tag contract; coarse table tags are never fired

Cached reads tag both the coarse table and the narrow per-key tags, but no
ordinary write fires a coarse tag — writers must enumerate the narrow tag for
every key they touch, through `updateTags()` in `lib/cacheTags.ts`. The coarse
tags exist only as a bulk-invalidation escape hatch. Blanket coarse invalidation
on every write would be simpler and correct, but would discard the caching it
buys.

**Consequence:** a writer that touches a key without firing its narrow tag
leaves those reads stale until `cacheLife` elapses. The failure is silence, not
an error — which is why `revalidateTag`/`revalidatePath` are forbidden outright.
