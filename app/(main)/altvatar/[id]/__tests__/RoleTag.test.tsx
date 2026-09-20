/**
 * Pins the roster's role label: every role the column admits reads as a word,
 * including the one no link grants.
 */
import { ROLES } from '@/lib/data/profile.roles';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RoleTag } from '../RoleTag';

describe('RoleTag', () => {
  it('RoleOwner_RendersOwnerWithItsOwnModifier', () => {
    render(<RoleTag role={ROLES.owner} />);

    expect(screen.getByText('Owner')).toHaveClass('member-role-tag--owner');
  });

  it('RoleManager_RendersManager', () => {
    render(<RoleTag role={ROLES.manager} />);

    expect(screen.getByText('Manager')).toBeInTheDocument();
  });

  it('RoleSelf_RendersYou', () => {
    // `self` never reaches this roster, but the profile card labels the same
    // vocabulary and the label rides on the record it shares with it.
    render(<RoleTag role={ROLES.self} />);

    expect(screen.getByText('You')).toBeInTheDocument();
  });
});
