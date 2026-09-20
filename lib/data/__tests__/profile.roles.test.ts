/**
 * Pins `profile-permissions` — "A role SHALL carry its own rights": the rights
 * a surface reads off a role record, and the single home its stored value has.
 */
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

import { ROLES, grantableRole, roleOf } from '@/lib/data/profile.roles';

describe('roleOf', () => {
  it('StoredValue_ResolvesToTheRecordCarryingItsRights', () => {
    expect(roleOf('self')).toMatchObject({ isSelf: true, admin: true });
    expect(roleOf('owner')).toMatchObject({ isSelf: false, admin: true });
    expect(roleOf('manager')).toMatchObject({ isSelf: false, admin: false });
  });

  it('ValueTheColumnCannotHold_ResolvesToTheNarrowestRights', () => {
    // The CHECK constraint admits three values, so this can only follow a
    // schema change: the read survives it holding nothing it has not earned.
    expect(roleOf('curator')).toMatchObject({ isSelf: false, admin: false });
  });
});

describe('grantableRole', () => {
  it('GrantableValue_ResolvesToItsRecord', () => {
    expect(grantableRole('manager')).toBe(ROLES.manager);
    expect(grantableRole('owner')).toBe(ROLES.owner);
  });

  it('IdentityRelation_IsRefused', () => {
    expect(grantableRole('self')).toBeUndefined();
  });

  it('UnknownValue_IsRefused', () => {
    expect(grantableRole('curator')).toBeUndefined();
  });
});

// Outside the module that maps a stored value back to its record, the schema's
// own DDL, and migration history, a role's stored value is not spelled — so
// renaming what the column holds is one edit and its migration.
const MAPPING_BOUNDARY = ['lib/data/profile.roles.ts', 'db/schema.ts'];

const ROLE_NAME_RULE =
  /(role[A-Za-z_.]*\s*[=!]==\s*['"](?:self|owner|manager)['"])|(['"](?:self|owner|manager)['"]\s*[=!]==)|(\brole\s*:\s*['"](?:self|owner|manager)['"])|(['"](?:self|owner|manager)['"](?:\s*,\s*['"](?:self|owner|manager)['"])*\s*\]\.includes)/;

function sourceFiles(): string[] {
  return execFileSync(
    'git',
    ['ls-files', 'lib/*.ts', 'lib/**/*.ts', 'app/**/*.ts', 'app/**/*.tsx', 'db/*.ts', 'scripts/*.ts'],
    { encoding: 'utf8' }
  )
    .split('\n')
    .filter(
      (path) =>
        path &&
        !path.includes('__tests__') &&
        !path.includes('.test.') &&
        !MAPPING_BOUNDARY.includes(path)
    );
}

describe('StoredRoleValues', () => {
  it('SourceOutsideTheMappingBoundary_SpellsNoRoleName', () => {
    const offenders = sourceFiles().filter((path) =>
      ROLE_NAME_RULE.test(readFileSync(path, 'utf8'))
    );

    expect(offenders).toEqual([]);
  });

  it('Scan_ReachesTheSurfacesThatDecideOnRoles', () => {
    expect(sourceFiles()).toEqual(
      expect.arrayContaining([
        'lib/data/profile.gate.ts',
        'lib/data/profile.members.actions.ts',
        'app/(main)/altvatar/[id]/PermissionsSection.tsx',
      ])
    );
  });

  it('NegativeControl_RuleMatchesSyntheticOffenders', () => {
    const offenders = [
      `if (role === 'owner') {}`,
      `if (role.value === 'manager') {}`,
      `actor.role.value === 'self'`,
      `role: 'owner'`,
      `['owner','manager'].includes`,
    ];
    for (const line of offenders) {
      expect(ROLE_NAME_RULE.test(line)).toBe(true);
    }
  });
});
