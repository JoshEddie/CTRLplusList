import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FocusEditor } from '../FocusEditor';
import type { RowField } from '../focus';
import { makeItem, mockActions } from './test-helpers';

vi.mock('@/lib/data/item.placeholder.actions', async () =>
  (await import('./test-helpers')).placeholderActionsMock()
);

function setup(field: RowField, over = {}, productUrl = 'https://shop/p') {
  const actions = mockActions();
  const onDone = vi.fn();
  render(
    <FocusEditor
      field={field}
      item={makeItem(over)}
      actions={actions}
      productUrl={productUrl}
      onDone={onDone}
    />
  );
  return { actions, onDone };
}

describe('FocusEditor', () => {
  describe('Title', () => {
    it('OverMaxName_DoneStaysEnabledAndCloses', async () => {
      // Edits are live, so blocking Done can't keep the error value out of the
      // item — the floor is Preview's Create/Save gate and the manual advance
      // rule, never a trapped editor.
      const user = userEvent.setup();
      const { onDone } = setup('title', { name: 'a'.repeat(120) });
      const done = screen.getByRole('button', { name: 'Done' });
      expect(done).toBeEnabled();
      await user.click(done);
      expect(onDone).toHaveBeenCalledOnce();
    });

    it('ValidName_EnablesDone-ClickCallsOnDone', async () => {
      const user = userEvent.setup();
      const { onDone } = setup('title');
      const done = screen.getByRole('button', { name: 'Done' });
      expect(done).toBeEnabled();
      await user.click(done);
      expect(onDone).toHaveBeenCalledOnce();
    });
  });

  describe('Price', () => {
    it('EmptyPrice_DoneStaysEnabledAndCloses', async () => {
      const user = userEvent.setup();
      const { onDone } = setup('price', {
        store: { name: 'Lodge', link: 'https://l', price: '' },
      });
      const done = screen.getByRole('button', { name: 'Done' });
      expect(done).toBeEnabled();
      await user.click(done);
      expect(onDone).toHaveBeenCalledOnce();
    });

    it('ValidPrice_EnablesDone', () => {
      setup('price');
      expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
    });

    it('TypePrice_CallsSetStore', async () => {
      const user = userEvent.setup();
      const { actions } = setup('price', {
        store: { name: 'Lodge', link: 'https://l', price: '' },
      });
      // PriceField is cents-based: "7" → $0.07.
      await user.type(screen.getByLabelText('Price'), '7');
      expect(actions.setStore).toHaveBeenLastCalledWith('price', '0.07');
    });

    it('NoProductUrl_UsesStoreLinkForSource', () => {
      setup(
        'price',
        {
          store: { name: 'Lodge', link: 'https://store.test/p', price: '' },
        },
        ''
      );
      expect(
        screen.getByRole('link', { name: /open the product page/i })
      ).toHaveAttribute('href', 'https://store.test/p');
    });

    it('EmptyStore_DoneEnabledWithProductUrlSource', () => {
      setup('price', { store: { name: '', link: '', price: '' } }, 'https://pasted.test/p');
      expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
      expect(
        screen.getByRole('link', { name: /open the product page/i })
      ).toHaveAttribute('href', 'https://pasted.test/p');
    });
  });

  describe('Note', () => {
    it('OverCapDescription_DoneStaysEnabled', () => {
      setup('note', { description: 'd'.repeat(150) });
      expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
    });
  });

  describe('Store', () => {
    it('Render_ShowsGroupedNameAndLinkFields', () => {
      setup('store');
      expect(screen.getByLabelText('Store name')).toHaveValue('Lodge');
      expect(screen.getByLabelText('Link')).toHaveValue('https://lodge');
      expect(screen.queryByLabelText('Price')).not.toBeInTheDocument();
    });

    it('EmptyName_DoneStaysEnabledAndCloses', async () => {
      const user = userEvent.setup();
      const { onDone } = setup('store', {
        store: { name: '', link: 'https://l', price: '9.99' },
      });
      const done = screen.getByRole('button', { name: 'Done' });
      expect(done).toBeEnabled();
      await user.click(done);
      expect(onDone).toHaveBeenCalledOnce();
    });

    it('TypeName_CallsSetStore', async () => {
      const user = userEvent.setup();
      const { actions } = setup('store', {
        store: { name: '', link: 'https://l', price: '9.99' },
      });
      await user.type(screen.getByLabelText('Store name'), 'L');
      expect(actions.setStore).toHaveBeenLastCalledWith('name', 'L');
    });

    it('TypeLink_CallsSetStore', async () => {
      const user = userEvent.setup();
      const { actions } = setup('store', {
        store: { name: 'Lodge', link: '', price: '9.99' },
      });
      await user.type(screen.getByLabelText('Link'), 'h');
      expect(actions.setStore).toHaveBeenLastCalledWith('link', 'h');
    });

    it('EmptyStore_RendersEmptyFieldsWithDoneEnabled', () => {
      setup('store', { store: { name: '', link: '', price: '' } });
      expect(screen.getByLabelText('Store name')).toHaveValue('');
      expect(screen.getByLabelText('Link')).toHaveValue('');
      expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
    });
  });

  describe('Photo', () => {
    it('Render_EnablesDone-ShowsStage', () => {
      setup('photo');
      expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
      expect(screen.getByAltText('Selected product image')).toBeInTheDocument();
    });
  });
});
