## ADDED Requirements

### Requirement: Codebase passes `eslint-plugin-react-hooks@7.x` rules with zero errors

The system SHALL pass `npm run lint` with zero errors from `eslint-plugin-react-hooks@7.x`, including the rules `react-hooks/set-state-in-effect`, `react-hooks/use-memo`, `react-hooks/immutability`, and `react-hooks/exhaustive-deps`. Any per-line `eslint-disable-next-line` directive targeting one of these rules MUST include a one-line comment explaining why the flagged pattern is legitimate at that site (e.g., a true side effect rather than derived state).

#### Scenario: Lint passes on the default branch

- **WHEN** `npm run lint` runs against the repository root
- **THEN** the process exits with status 0 and reports zero errors

#### Scenario: A justified disable comment is acceptable

- **WHEN** a contributor encounters a flagged site where the rule is overly conservative (e.g., closing a transient UI element in response to navigation)
- **THEN** an `// eslint-disable-next-line react-hooks/<rule-name>` directive with a one-line reason comment satisfies this requirement
- **AND** blanket file- or repo-level disables of these rules do NOT satisfy this requirement

### Requirement: Codebase passes `eslint-plugin-react-hooks@7.x` rules with zero warnings

The system SHALL pass `npm run lint` with zero warnings from the rules above. Stale `eslint-disable` directives that no longer match a real violation MUST be removed.

#### Scenario: Lint reports no warnings

- **WHEN** `npm run lint` runs against the repository root
- **THEN** the process reports zero warnings under any `react-hooks/*` rule

#### Scenario: A previously suppressed violation has been refactored away

- **WHEN** the underlying code is refactored so the original violation no longer occurs
- **THEN** the corresponding `eslint-disable` directive is removed in the same change so it does not produce an "unused eslint-disable" warning
