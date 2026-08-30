/**
 * Pins the roster's role label: the two grantable roles read as words, and a
 * role the label table does not know renders its stored value rather than
 * blanking the cell.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RoleTag } from '../RoleTag';

describe('RoleTag', () => {
  it('RoleOwner_RendersOwnerWithItsOwnModifier', () => {
    render(<RoleTag role="owner" />);

    expect(screen.getByText('Owner')).toHaveClass('member-role-tag--owner');
  });

  it('RoleManager_RendersManager', () => {
    render(<RoleTag role="manager" />);

    expect(screen.getByText('Manager')).toBeInTheDocument();
  });

  it('UnlabelledRole_RendersTheStoredValue', () => {
    // `self` never reaches this roster, but the column admits it and a role
    // added later would arrive here before its label does.
    render(<RoleTag role="self" />);

    expect(screen.getByText('self')).toBeInTheDocument();
  });
});
