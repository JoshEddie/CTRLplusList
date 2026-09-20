# Every request names two profiles

`UserIdentity` exposes `selfProfile` and `activeProfile` and deliberately never
an unqualified "current profile": ownership columns and creation take the active
profile, while anything naming the human — follows, blocks, claim assertion —
takes the self-profile. The whole identity is passed around so neither can be
reached by default, because the alternative (one actor id per request) would let
a viewer's block state change by switching profiles.

**Consequence:** writing `viewer.activeProfile.id` into a check that should name
the human is a silent authorization bypass, not a type error.
