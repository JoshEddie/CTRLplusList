# Profile art never comes from the account

**Touching**: `DAL`, `DB Queries`

**Context**: Eight reads across `lib/data/` resolved a profile's picture by joining `profile_members` → `users` for `users.image`, a column NextAuth writes out-of-band from Google — which forced two of them to opt out of caching entirely. A managed profile has no account, so that chain could never give one a face.

**Decision**: A profile's identity art is read from the app's own per-profile table, joined directly on the profile id. `users.image` is never read: NextAuth keeps writing it and no application code consults it. Every avatar in the app is profile-valued — there is no account-valued avatar, and no account-linkage branch decides whether a face is available.

**Consequences**: The profile → account hop disappears from eight reads, and the out-of-band-write caching exemption goes with it. A managed profile and a self-profile render through one path, so no surface has to ask which kind it is holding.
