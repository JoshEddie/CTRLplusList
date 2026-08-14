import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { NoteEditor } from '../NoteEditor';

describe('NoteEditor', () => {
  it('Empty_CounterShowsZeroOverMax', () => {
    render(<NoteEditor description="" onChange={vi.fn()} />);
    expect(screen.getByText('0/100')).toBeInTheDocument();
  });

  it('Type_CallsOnChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<NoteEditor description="" onChange={onChange} />);
    await user.type(screen.getByLabelText('Description'), 'x');
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('WithHelper_RendersHelperCopy', () => {
    render(
      <NoteEditor
        description=""
        onChange={vi.fn()}
        helper="Move size and color here."
      />
    );
    expect(screen.getByText('Move size and color here.')).toBeInTheDocument();
  });

  it('OverCapValue_ShowsTrimErrorAndCount', () => {
    render(<NoteEditor description={'d'.repeat(150)} onChange={vi.fn()} />);
    expect(screen.getByText('150/100')).toBeInTheDocument();
    expect(screen.getByText(/trim it to save/i)).toBeInTheDocument();
  });
});
