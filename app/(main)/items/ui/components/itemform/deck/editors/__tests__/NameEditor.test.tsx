import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { NameEditor } from '../NameEditor';

const LONG =
  'Premium Stainless Steel Water Bottle - Insulated Leakproof 32oz Travel Mug';

function setup(name: string, description = '') {
  const onNameChange = vi.fn();
  const onDescriptionChange = vi.fn();
  render(
    <NameEditor
      name={name}
      description={description}
      onNameChange={onNameChange}
      onDescriptionChange={onDescriptionChange}
    />
  );
  return { onNameChange, onDescriptionChange };
}

function StatefulHarness({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [description, setDescription] = useState('');
  return (
    <NameEditor
      name={name}
      description={description}
      onNameChange={setName}
      onDescriptionChange={setDescription}
    />
  );
}

describe('NameEditor', () => {
  describe('GoodTitle', () => {
    it('Render_NoTrimChip-NoInlineNote', () => {
      setup('Cast Iron Skillet');
      expect(
        screen.queryByRole('button', { name: /Tap to use/ })
      ).not.toBeInTheDocument();
      expect(screen.queryByLabelText('Description')).not.toBeInTheDocument();
    });

    it('Render_CounterShowsLengthOverMax', () => {
      setup('Cast Iron Skillet');
      expect(screen.getByText('17/100')).toBeInTheDocument();
    });

    it('TypeName_CallsOnNameChange', async () => {
      const user = userEvent.setup();
      const { onNameChange } = setup('');
      await user.type(screen.getByLabelText('Item name'), 'x');
      expect(onNameChange).toHaveBeenCalledWith('x');
    });

    it('NameInput_OptsOutOfAutofill', () => {
      // autocomplete="off" + no name/id of "name" so the browser doesn't offer
      // the signed-in person's first name for the item's name.
      setup('Cast Iron Skillet');
      const input = screen.getByLabelText('Item name');
      expect(input).toHaveAttribute('autocomplete', 'off');
      expect(input).not.toHaveAttribute('name', 'name');
    });
  });

  describe('WarnTitle', () => {
    it('Render_ShowsTrimSuggestionTowardDescription', () => {
      setup(LONG);
      expect(screen.getByText(/Longer than 50 characters/)).toBeInTheDocument();
    });

    it('Render_RevealsInlineNoteEditor', () => {
      setup(LONG);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });

    it('ClickTrim_CallsOnNameChangeWithShortName', async () => {
      const user = userEvent.setup();
      const { onNameChange } = setup(LONG);
      await user.click(screen.getByRole('button', { name: /Tap to use/ }));
      expect(onNameChange).toHaveBeenCalledWith(
        'Premium Stainless Steel Water Bottle'
      );
    });

    it('TrimToGood_KeepsInlineNoteVisible-RemovesChip', async () => {
      const user = userEvent.setup();
      render(<StatefulHarness initial={LONG} />);
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: /Tap to use/ }));
      // Trim made the title "good", but the surfaced note must remain so the
      // user can still move detail into it; only the chip goes away.
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Tap to use/ })
      ).not.toBeInTheDocument();
    });

    it('TypeInlineNote_CallsOnDescriptionChange', async () => {
      const user = userEvent.setup();
      const { onDescriptionChange } = setup(LONG);
      await user.type(screen.getByLabelText('Description'), 'x');
      expect(onDescriptionChange).toHaveBeenCalledWith('x');
    });
  });

  describe('ErrorTitle', () => {
    it('OverMax_ShowsLimitError-RevealsInlineNote', () => {
      setup('a'.repeat(120));
      expect(screen.getByText(/over the 100-character limit/)).toBeInTheDocument();
      expect(screen.getByLabelText('Description')).toBeInTheDocument();
    });
  });
});
