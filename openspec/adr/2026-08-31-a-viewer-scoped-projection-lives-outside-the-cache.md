# A viewer-scoped projection lives outside the cache

**Touching**: `DAL`, `DB Queries`

**Context**: The item reads project claim attribution inside `'use cache'`, which keys correctly only while the viewer-scoped input is a pure URL value — sourcing it from the database would key the cache on an input that can go stale without the read's tags firing. Moving the projection out collided with the requirement that rows be sanitized before escaping the data layer, and aggregates over the rows the projection strips cannot be computed after it has run.

**Decision**: A viewer-scoped projection runs **outside** the cache boundary, as an uncached exported read wrapping a cached raw one. The data-layer boundary, not the cached function, is what the projection must precede. The cached read holds one raw variant serving every viewer, and anything derived from un-projected rows is computed in the wrapper.

**Consequences**: Per-viewer cache fragmentation disappears wherever a read was keyed on viewer identity, and aggregates over data the viewer may not see become possible. Raw rows carrying names and ids now sit in the cache where projected ones did, so the cache store holds more than any single viewer is entitled to.
