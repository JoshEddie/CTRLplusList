# Acceptance — embark-namespace

## Flows

### Flow: Boarding a cleared issue stops at the proposal

- **Given** issue 300 is labeled `CHARTED`
- **And** issue 300 has zero open blocked-by relationships
- **And** the working copy is on `dev` and not behind `origin/dev`
- **When** the owner runs `/embark-start 300`
- **Then** `openspec/changes/<name>/proposal.md` exists
- **And** `proposal.md` records issue 300 by number
- **And** `openspec/changes/<name>/specs/` does not exist
- **And** `design.md`, `acceptance.md`, `tasks.md` and `review.md` do not exist
- **And** the closing output names `/embark-design`
- **And** issue 300 is still labeled `CHARTED`
- **And** issue 300 is not labeled `UNDER SAIL`

### Flow: A non-CHARTED issue stops boarding

- **Given** issue 301 is labeled `OFF THE MAP`
- **When** the owner runs `/embark-start 301`
- **Then** the output names the routing labels found on issue 301
- **And** no change directory is created
- **And** no `/map` phase is entered

### Flow: An open blocker stops boarding

- **Given** issue 302 is labeled `CHARTED`
- **And** issue 302 is blocked by issue 299, which is open
- **When** the owner runs `/embark-start 302`
- **Then** the output names issue 299 by number and title
- **And** no change directory is created

### Flow: A closed blocker does not stop boarding

- **Given** issue 303 is labeled `CHARTED`
- **And** issue 303 is blocked by issue 298, which is closed
- **When** the owner runs `/embark-start 303`
- **Then** `proposal.md` is created
- **And** no blocker is reported

### Flow: Re-running boarding after the proposal exists changes nothing

- **Given** the change for issue 300 holds a `proposal.md`
- **When** the owner runs `/embark-start 300` a second time
- **Then** the output states nothing remains for it
- **And** the output names `/embark-design`
- **And** `proposal.md` is byte-identical to before the run
- **And** the issue is not re-read for boarding

### Flow: The terrain check routes out an epic before any change directory exists

- **Given** issue 304 is labeled `CHARTED` with zero open blockers
- **And** the terrain check finds the issue spans more than one OpenSpec change
- **When** the owner confirms the issue is epic-sized
- **Then** `/map`'s chart phase runs in the same conversation
- **And** no change directory is created
- **And** no `proposal.md` is written

### Flow: Design writes the contract in the interview's turn

- **Given** the change holds a `proposal.md` and no `specs/` directory
- **When** the owner runs `/embark-design`
- **And** the owner confirms shared understanding to conclude the `/mattpocock-skills:grilling` interview
- **Then** `specs/` holds at least one delta spec file
- **And** `design.md` exists
- **And** `acceptance.md` does not exist
- **And** `tasks.md` does not exist
- **And** the closing output names `/embark-qualify`
- **And** the closing output states that `/embark-qualify` must run in a fresh chat

### Flow: Design invoked before a proposal exists stops

- **Given** the change directory holds no `proposal.md`
- **When** the owner runs `/embark-design`
- **Then** the output names `/embark-start`
- **And** no grill interview starts
- **And** no artifact is generated

### Flow: Re-entering design before specs re-runs the interview

- **Given** the change holds a `proposal.md` and no `specs/` directory
- **And** `/embark-design` has already run once against an earlier proposal
- **When** the owner runs `/embark-design` again
- **Then** the `/mattpocock-skills:grilling` interview starts
- **And** no delta spec is written before the owner concludes the interview

### Flow: Re-entering design after specs still interviews

- **Given** the change holds a `specs/` directory and no `design.md`
- **When** the owner runs `/embark-design`
- **Then** the grill interview starts
- **And** no question re-opens a decision the written specs state
- **And** `design.md` is created
- **And** no file under `specs/` is modified

### Flow: The interview reads the issue the proposal records

- **Given** the change's `proposal.md` records issue 300
- **And** issue 300 links a `MAP`-labeled index whose other chunks are open
- **And** issue 300 blocks issue 306
- **When** the owner runs `/embark-design`
- **Then** issue 300 is read before the first question is asked
- **And** the linked map's body is read before the first question is asked
- **And** issue 306 is read before the first question is asked
- **And** no sub-issue of the map other than issue 306 is read
- **And** the owner is not asked which issue is in scope

### Flow: A moved decision reaches the proposal before specs are drafted

- **Given** the `/mattpocock-skills:grilling` interview has changed a decision the proposal records
- **When** the owner confirms the interview's conclusion
- **Then** `/opsx:update` revises `proposal.md`
- **And** the revision is written before any delta spec file exists

### Flow: A stop survives the session that produced it

- **Given** `/embark-design` has written `specs/` and `design.md` and stopped
- **And** the session that ran it has ended
- **When** the owner runs `/embark-qualify` in a new chat
- **Then** the run proceeds from the change directory
- **And** the owner is asked nothing about the earlier interview

### Flow: The planning members flip no label

- **Given** issue 300 is labeled `CHARTED`
- **When** the owner runs `/embark-start 300`, then `/embark-design`, then `/embark-qualify`, then `/embark-write-tasks`
- **Then** issue 300 is still labeled `CHARTED`
- **And** issue 300 is not labeled `UNDER SAIL`
- **And** no label was added or removed at any point in the sequence

### Flow: Qualification reports an unbacked step as a gap

- **Given** a change whose `design.md` relies on a step no delta or canonical scenario states
- **And** a chat that did not write that change's specs or design
- **When** the owner runs `/embark-qualify`
- **Then** the output names the step as a gap
- **And** the output names the delta spec that must gain the scenario
- **And** `acceptance.md` does not contain a flow row chaining through the unbacked step

### Flow: Design wording is used without a finding

- **Given** a step backed by a delta scenario and described more clearly in `design.md`
- **When** the owner runs `/embark-qualify`
- **Then** the flow row carries `design.md`'s wording
- **And** no gap is reported for that step
- **And** no contradiction is reported for that step

### Flow: Design contradicting a spec disqualifies the change

- **Given** `design.md` asserts behavior a delta spec denies
- **When** the owner runs `/embark-qualify`
- **Then** the output names the conflict as a contradiction
- **And** the output does not state that the specs are the file to change
- **And** the output leaves the choice of file to the owner

### Flow: A reported gap is repaired through opsx:update

- **Given** `/embark-qualify` has reported a gap naming a delta spec
- **When** the owner runs `/opsx:update`
- **Then** the named delta spec gains the missing scenario
- **And** no spec file was edited outside `/opsx:update`

### Flow: Tasks are written from disk with no interview

- **Given** the change holds `specs/`, `design.md` and `acceptance.md`, with every reported gap repaired
- **When** the owner runs `/embark-write-tasks`
- **Then** `tasks.md` exists
- **And** `review.md` exists carrying `round: 0`
- **And** `review.md` contains no `## Round` section
- **And** the owner is asked no question during the run
- **And** the closing output names `/embark-apply`

### Flow: A malformed bundle does not occupy the tree

- **Given** a change whose `openspec validate --strict` fails
- **And** no issue is labeled `UNDER SAIL`
- **When** the owner runs `/embark-apply`
- **Then** the output reports the validation failure
- **And** the issue is not labeled `UNDER SAIL`
- **And** `CHARTED` is not removed from the issue
- **And** no implementation begins

### Flow: A valid bundle occupies the tree

- **Given** a change whose `openspec validate --strict` passes
- **And** no issue is labeled `UNDER SAIL`
- **When** the owner runs `/embark-apply`
- **Then** the issue is labeled `UNDER SAIL`
- **And** the issue is no longer labeled `CHARTED`
- **And** the output states the three mid-voyage disciplines
- **And** the task loop begins

### Flow: An occupied tree blocks a second voyage

- **Given** issue 305 is labeled `UNDER SAIL`
- **When** the owner runs `/embark-apply` against the change for issue 300
- **Then** the output names issue 305
- **And** issue 300 is not labeled `UNDER SAIL`
- **And** issue 300 is still labeled `CHARTED`
- **And** no validation runs

### Flow: The MUSTER lane runs without a validate gate

- **Given** issue 297 is labeled `MUSTER`
- **And** no issue is labeled `UNDER SAIL`
- **And** every `#### Scenario:` heading the ticket body cites exists in an active spec
- **When** the owner runs `/embark-apply 297`
- **Then** issue 297 is labeled `UNDER SAIL`
- **And** issue 297 is still labeled `MUSTER`
- **And** no `openspec validate --strict` is run
- **And** no change directory is created

### Flow: A stale MUSTER plan stops the voyage

- **Given** issue 297 is labeled `MUSTER`
- **And** the ticket body cites a `#### Scenario:` heading absent from every active spec
- **When** the owner runs `/embark-apply 297`
- **Then** the output names the missing heading
- **And** no test file is written

### Flow: Verify is suggested and not run

- **Given** `/embark-apply` has run its task loop to completion
- **When** the owner reads the skill's closing output
- **Then** the output suggests running `/opsx:verify` in a fresh chat
- **And** `/opsx:verify` has not been invoked
- **And** the suggestion is not a numbered task in `tasks.md`

### Flow: The next artifact after design is acceptance

- **Given** a change holding `proposal.md`, `specs/` and `design.md` and no `acceptance.md`
- **When** the owner runs `/opsx:continue`
- **Then** `acceptance.md` is created
- **And** `tasks.md` is not created

### Flow: The grill gate fires at specs, not at the proposal

- **Given** a change holding no `proposal.md`
- **When** the owner runs `openspec instructions proposal --change <name>`
- **Then** the printed rules do not require a concluded grilling interview
- **And** the printed rules still require the active-spec grep

### Flow: The specs instruction carries the grill gate

- **Given** a change holding a `proposal.md`
- **When** the owner runs `openspec instructions specs --change <name>`
- **Then** the printed rules require the `/mattpocock-skills:grilling` interview to have concluded against the reviewed proposal

## No manual path — fully automated

- **Owner-invoked only (`disable-model-invocation: true`)** — a negative property of skill frontmatter. It is confirmed by reading the five `SKILL.md` files, not by a walk; no owner action makes a correctly-configured skill visibly decline to self-fire.
- **No member restates the interview skill's mechanics** — confirmed by reading the five `SKILL.md` files for the absence of duplicated interview rules.
- **`acceptance` keeps `requires: [specs]` and upstream's relative artifact order is preserved** — confirmed by reading `openspec/schemas/spec-driven-review/schema.yaml`. The observable consequence (acceptance never reads `blocked` when design is skipped) has no distinct owner walk beyond the artifact-order flow above.
- **The review scaffold never blocks apply** — `apply.requires` resolution is CLI-internal; the owner observes only that apply proceeds, which the apply flows already assert.
