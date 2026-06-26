import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FocusEditor, type FocusField } from '../FocusEditor';
import { makeItem, mockActions } from './test-helpers';

function setup(field: FocusField, over = {}, productUrl = 'https://shop/p') {
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
    it('OverMaxName_DisablesDone', () => {
      setup('title', { name: 'a'.repeat(120) });
      expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
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
    it('EmptyPrice_DisablesDone', () => {
      setup('price', {
        stores: [{ name: 'Lodge', link: 'https://l', price: '' }],
      });
      expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    });

    it('ValidPrice_EnablesDone', () => {
      setup('price');
      expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
    });

    it('TypePrice_CallsSetStoreOnPrimaryStore', async () => {
      const user = userEvent.setup();
      const { actions } = setup('price', {
        stores: [{ name: 'Lodge', link: 'https://l', price: '' }],
      });
      // PriceField is cents-based: "7" → $0.07.
      await user.type(screen.getByLabelText('Price'), '7');
      expect(actions.setStore).toHaveBeenLastCalledWith(0, 'price', '0.07');
    });

    it('NoProductUrl_UsesStoreLinkForSource', () => {
      setup(
        'price',
        { stores: [{ name: 'Lodge', link: 'https://store.test/p', price: '' }] },
        ''
      );
      expect(
        screen.getByRole('link', { name: /open the product page/i })
      ).toHaveAttribute('href', 'https://store.test/p');
    });

    it('NoStoreRow_BlocksDoneWithProductUrlSource', () => {
      setup('price', { stores: [] }, 'https://pasted.test/p');
      expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
      expect(
        screen.getByRole('link', { name: /open the product page/i })
      ).toHaveAttribute('href', 'https://pasted.test/p');
    });
  });

  describe('Note', () => {
    it('OverCapDescription_DisablesDone', () => {
      setup('note', { description: 'd'.repeat(150) });
      expect(screen.getByRole('button', { name: 'Done' })).toBeDisabled();
    });
  });

  describe('Photo', () => {
    it('Render_EnablesDone-ShowsStage', () => {
      setup('photo');
      expect(screen.getByRole('button', { name: 'Done' })).toBeEnabled();
      expect(
        screen.getByAltText('Selected product image')
      ).toBeInTheDocument();
    });
  });
});
