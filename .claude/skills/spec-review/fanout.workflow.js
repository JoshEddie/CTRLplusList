export const meta = {
  name: 'spec-review-fanout',
  description: 'Three-phase spec-review fan-out (standard / convention / contract) returning schema-validated findings',
  phases: [
    { title: 'Audit', detail: 'standard / convention / contract review agents, schema-validated findings' },
  ],
}

// Inputs (args), all resolved by the skill's Phase 0 before invocation:
//   diffCmd:      string  — command that produces the diff (e.g. "gh pr diff 123", "git diff dev...HEAD")
//   changeName:   string | null  — resolved OpenSpec change; null ⇒ no contract phase (audit skipped)
//   archiveState: string | null  — "active" | "Type 1 premature" | "Type 2 merged" | null
//   briefs:       { standard, convention, contract }  — paths to the bundled brief files
//
// Returns: { findings: Finding[], deferredToCI: string[] }
//   Each finding is schema-validated to the shared finding shape so the skill consolidates
//   uniform objects rather than parsed prose. Findings are NOT correctness-checked here —
//   the verdict is advisory and the post-review explore step investigates findings on demand.

// Single machine source of the finding shape (mirrors the human description in reference/finding-format.md).
const FINDING = {
  type: 'object',
  additionalProperties: false,
  required: ['phase', 'location', 'description', 'severity', 'citation', 'disposition'],
  properties: {
    phase:       { type: 'string', enum: ['standard', 'convention', 'contract'] },
    location:    { type: 'string', description: 'path:line' },
    description: { type: 'string', description: 'terse statement of the problem' },
    severity:    { type: 'string', enum: ['Critical', 'Major', 'Minor'] },
    citation:    { type: 'string', description: 'the offending line, and (convention/contract) the doc rule or SHALL violated' },
    disposition: { type: 'string', enum: ['Fix now', 'File issue', 'Drop'] },
  },
}

const FINDINGS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['findings'],
  properties: {
    findings: { type: 'array', items: FINDING },
    // contract agent only: tasks explicitly deferred to CI (a [~] gate), surfaced
    // so the skill can confirm them against the actual check run it reads later.
    deferredToCI: { type: 'array', items: { type: 'string' } },
  },
}

// args may arrive parsed (the documented contract) or, depending on how the caller
// serialized the tool input, as a JSON string — normalize both to an object.
const input = typeof args === 'string' ? JSON.parse(args) : (args ?? {})
const { diffCmd, changeName, archiveState, briefs = {} } = input
if (!briefs.standard || !briefs.convention || (changeName && !briefs.contract)) {
  throw new Error(`spec-review-fanout: missing args.briefs path(s); got args=${JSON.stringify(args)}`)
}

const PHASES = [
  { key: 'standard', brief: briefs.standard },
  { key: 'convention', brief: briefs.convention },
]
if (changeName) {
  PHASES.push({ key: 'contract', brief: briefs.contract })
}

const auditPrompt = (p) => {
  const base =
    `You are the ${p.key}-review agent for /spec-review. ` +
    `First Read your brief at ${p.brief} and follow it exactly. ` +
    `Produce the diff under review with: \`${diffCmd}\`, then review it. ` +
    `Return every finding through the structured-output schema; set phase to "${p.key}".`
  if (p.key !== 'contract') return base
  return base +
    ` Resolved change: ${changeName}. Archive state: ${archiveState}. ` +
    `Apply the framing and reconciliation latitude for that state exactly as the brief describes. ` +
    `Surface any task explicitly deferred to CI as a deferredToCI entry rather than a missing-work finding.`
}

const perPhase = await parallel(
  PHASES.map((p) => () =>
    agent(auditPrompt(p), { label: `audit:${p.key}`, phase: 'Audit', schema: FINDINGS_SCHEMA }).then((r) => ({
      findings: r?.findings ?? [],
      deferredToCI: r?.deferredToCI ?? [],
    }))
  )
)

const ok = perPhase.filter(Boolean)
return {
  findings: ok.flatMap((r) => r.findings),
  deferredToCI: ok.flatMap((r) => r.deferredToCI),
}
