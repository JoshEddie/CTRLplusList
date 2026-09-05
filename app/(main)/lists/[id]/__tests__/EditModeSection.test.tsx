import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import EditModeSection from '../EditModeSection';

describe('EditModeSection', () => {
  it('Title_NamesTheRegion', () => {
    render(
      <EditModeSection kind="in" title="In this list · 3">
        <ul>
          <li>row</li>
        </ul>
      </EditModeSection>
    );
    expect(
      screen.getByRole('region', { name: 'In this list · 3' })
    ).toHaveClass('edit-mode-section--in');
    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.queryByText('hint')).not.toBeInTheDocument();
  });

  it('HintAndEmpty_RenderWhenGiven', () => {
    render(
      <EditModeSection
        kind="out"
        title="Not in this list · 0"
        hint="Clear search to reorder"
        empty="Nothing here"
      />
    );
    expect(screen.getByText('Clear search to reorder')).toBeInTheDocument();
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
