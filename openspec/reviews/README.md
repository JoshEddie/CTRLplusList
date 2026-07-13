# openspec/reviews/

One persisted `/release-review` report per release version: `<version>.md` (e.g. `1.4.0.md`), named after the release PR's milestone title.

Each file opens with the review family's shared machine-readable header (see `.claude/skills/spec-review/reference/finding-format.md`) and accumulates append-only rounds (`/recheck-review`). These reports double as the repo's release record.
