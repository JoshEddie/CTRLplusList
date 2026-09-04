import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EditModeHeader from '../EditModeHeader';
import type { ListDetailsDraft } from '../editModeChanges';

vi.mock('@/app/(main)/lists/ui/components/ListHeroSurface', () => ({
  default: ({
    title,
    children,
  }: {
    title: string;
    children: React.ReactNode;
  }) => (
    <div>
      <div data-testid="collapsed-title">{title}</div>
      {children}
    </div>
  ),
}));

const onChange = vi.fn();

const DRAFT: ListDetailsDraft = {
  name: 'Birthday',
  subtitle: 'Brandy Family',
  occasion: 'Birthday',
  date: '2026-03-04',
};

function renderHeader(
  overrides: Partial<ListDetailsDraft> = {},
  disabled = false
) {
  return render(
    <EditModeHeader
      draft={{ ...DRAFT, ...overrides }}
      onChange={onChange}
      disabled={disabled}
    />
  );
}

beforeEach(() => vi.clearAllMocks());

describe('EditModeHeader', () => {
  it('Render_SeedsEveryListDetailFieldFromTheDraft', () => {
    renderHeader();
    expect(screen.getByLabelText(/Name/)).toHaveValue('Birthday');
    expect(screen.getByLabelText('Subtitle')).toHaveValue('Brandy Family');
    expect(screen.getByLabelText('Occasion')).toHaveValue('Birthday');
    expect(screen.getByLabelText(/Date/)).toHaveValue('2026-03-04');
  });

  it('Render_CarriesStagedNameOnCollapsedStrip', () => {
    renderHeader({ name: 'Renamed' });
    expect(screen.getByTestId('collapsed-title')).toHaveTextContent('Renamed');
  });

  it('TypeInName_ReportsOnlyTheChangedField', async () => {
    const user = userEvent.setup();
    renderHeader({ name: '' });
    await user.type(screen.getByLabelText(/Name/), 'X');
    expect(onChange).toHaveBeenCalledWith({ name: 'X' });
  });

  it('TypeInSubtitle_ReportsOnlyTheChangedField', async () => {
    const user = userEvent.setup();
    renderHeader({ subtitle: '' });
    await user.type(screen.getByLabelText('Subtitle'), 'Y');
    expect(onChange).toHaveBeenCalledWith({ subtitle: 'Y' });
  });

  it('TypeInOccasion_ReportsOnlyTheChangedField', async () => {
    const user = userEvent.setup();
    renderHeader({ occasion: '' });
    await user.type(screen.getByLabelText('Occasion'), 'Z');
    expect(onChange).toHaveBeenCalledWith({ occasion: 'Z' });
  });

  it('TypeInDate_ReportsOnlyTheChangedField', async () => {
    const user = userEvent.setup();
    renderHeader({ date: '' });
    await user.type(screen.getByLabelText(/Date/), '2026-12-25');
    expect(onChange).toHaveBeenLastCalledWith({ date: '2026-12-25' });
  });

  it('ClearedDate_ShowsInvalidDateError', () => {
    renderHeader({ date: '' });
    expect(screen.getByText('Please enter a valid date')).toBeInTheDocument();
  });

  it('ValidDate_ShowsNoError', () => {
    renderHeader();
    expect(
      screen.queryByText('Please enter a valid date')
    ).not.toBeInTheDocument();
  });

  it('Disabled_DisablesEveryField', () => {
    renderHeader({}, true);
    expect(screen.getByLabelText(/Name/)).toBeDisabled();
    expect(screen.getByLabelText('Subtitle')).toBeDisabled();
    expect(screen.getByLabelText('Occasion')).toBeDisabled();
    expect(screen.getByLabelText(/Date/)).toBeDisabled();
  });
});
