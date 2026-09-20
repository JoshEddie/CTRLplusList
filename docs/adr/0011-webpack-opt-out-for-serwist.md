# `next build --webpack` — a deliberate Turbopack opt-out

`@serwist/next` 9.5 does not support Turbopack, and Serwist emits the PWA
manifest, service worker, and offline assets at build time. The build script
therefore pins webpack explicitly.

**Expiry condition:** when Serwist supports Turbopack, drop `--webpack` and this
ADR.
