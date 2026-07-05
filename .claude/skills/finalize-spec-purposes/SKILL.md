---
name: finalize-spec-purposes
description: Finalize spec Purposes after archiving an OpenSpec change - replaces the TBD stubs upstream archive/sync leaves on capability specs. The standing last step of the OpenSpec workflow; also use whenever any spec Purpose reads "TBD". Idempotent - safe to run any time; reports "nothing to finalize" when all Purposes are real.
metadata:
  author: list_eddiefamily
  version: '1.0'
---

# /finalize-spec-purposes

The upstream OpenSpec archive/sync workflow stubs `TBD - created by archiving change <X>. Update Purpose after archive.` onto every capability spec it creates — it never writes a real Purpose. This skill is the repo's post-archive step that repairs those stubs. It pairs with the lint gate in [scripts/check-spec-purposes.mjs](../../../scripts/check-spec-purposes.mjs): the gate blocks any TBD stub not grandfathered in its `KNOWN_TBD` baseline, and this skill ratchets that baseline down as it backfills.

Project flow: `/opsx:propose` → `/opsx:apply` → `/opsx:archive` → **this skill**.

**Steps**

1. **Scan for stubs**

   Check every `openspec/specs/*/spec.md` for a `## Purpose` section that is missing, empty, or starts with `TBD`:

   ```bash
   grep -l "^TBD" openspec/specs/*/spec.md; grep -L "^## Purpose" openspec/specs/*/spec.md
   ```

   If nothing matches, report "nothing to finalize" and stop. Running this skill twice in a row is always safe.

2. **Locate each stub's originating change**

   The stub text names it: `TBD - created by archiving change <X>`. The archived change lives at `openspec/changes/archive/YYYY-MM-DD-<X>/`. Read its `proposal.md` (the Why section especially) and, when present, `design.md`.

   If the named change can't be found, fall back to the spec's own requirement bodies — they are the authoritative behavior contract and are sufficient on their own.

3. **Draft each Purpose**

   1–3 sentences stating what the capability governs and why it exists, derived ONLY from the proposal's Why and the spec's final requirement set. Derivation, not invention: no behavior may be described that the requirements don't already establish, and no requirement text may be edited. Match the register of a filled-in example such as `openspec/specs/data-layer-organization/spec.md` or `openspec/specs/testing-foundation/spec.md`.

4. **Confirm with the user**

   Present all drafts in one batch (capability → proposed Purpose) and ask for approval before writing. Apply any wording edits the user requests.

5. **Write and ratchet**

   - Replace each stub with its approved Purpose (touch nothing else in the file).
   - Remove each backfilled capability from the `KNOWN_TBD` set in [scripts/check-spec-purposes.mjs](../../../scripts/check-spec-purposes.mjs) — the gate errors on stale entries, so skipping this fails `npm run lint`.

6. **Verify**

   ```bash
   node scripts/check-spec-purposes.mjs
   npx -y @fission-ai/openspec@latest validate --strict
   ```

   Both must pass. If the openspec CLI is unreachable (offline), the purpose check alone is the required gate.

**Guardrails**

- Never modify Requirements, Scenarios, or any section other than `## Purpose`.
- Never add entries to `KNOWN_TBD` — it only shrinks. A brand-new spec with a TBD Purpose should be backfilled in the same session that archived it, not grandfathered.
- Partial runs are fine: backfill a subset, prune only those entries, rerun later for the rest.
