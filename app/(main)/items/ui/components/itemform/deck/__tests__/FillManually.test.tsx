import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { FillManually } from '../FillManually';
import { makeItem } from './test-helpers';

function setup(over = {}, handlers = {}) {
  const props = {
    onBack: vi.fn(),
    onFocus: vi.fn(),
    ...handlers,
  };
  render(<FillManually item={makeItem(over)} {...props} />);
  return props;
}

const blank = {
  name: '',
  photos: [],
  store: { name: '', link: '', price: '' },
};

describe('FillManually', () => {
  it('Render_ShowsFillCopy', () => {
    setup(blank);
    expect(
      screen.getByRole('heading', { name: 'Add the details' })
    ).toBeInTheDocument();
    expect(screen.getByText('Tap a field to fill it in.')).toBeInTheDocument();
  });

  it('Render_HasNoBackToPreviewExit', () => {
    setup(blank);
    expect(
      screen.queryByRole('button', { name: /Back to preview/ })
    ).not.toBeInTheDocument();
  });

  it('ClickUseALinkInstead_InvokesBack', async () => {
    const user = userEvent.setup();
    const { onBack } = setup(blank);
    await user.click(
      screen.getByRole('button', { name: /Use a link instead/ })
    );
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('BackExit_IsSecondaryRetreatNotPrimary', () => {
    setup(blank);
    const back = screen.getByRole('button', { name: /Use a link instead/ });
    expect(back).toHaveClass('secondary');
    expect(back).not.toHaveClass('primary');
  });

  it('BlankItem_NagsNameAndPhotoOnly-NotLinklessStoreOrPrice', () => {
    // A blank store (name+link both empty) is a supported linkless state, so
    // the store and price rows don't nag — only name and photo do.
    setup(blank);
    expect(screen.getByText('An item needs a name.')).toBeInTheDocument();
    expect(screen.getByText('No photo yet — add one.')).toBeInTheDocument();
    expect(
      screen.queryByText('Add a price so people know the cost.')
    ).not.toBeInTheDocument();
    expect(screen.queryByText('The store needs a name.')).not.toBeInTheDocument();
    expect(screen.queryByText('Needs you')).not.toBeInTheDocument();
  });

  it('ClickNameRow_OpensTitleFocus', async () => {
    const user = userEvent.setup();
    const { onFocus } = setup(blank);
    await user.click(screen.getByRole('button', { name: /Item name/ }));
    expect(onFocus).toHaveBeenCalledWith('title');
  });

  it('ClickStoreRow_OpensStoreFocus', async () => {
    const user = userEvent.setup();
    const { onFocus } = setup(blank);
    await user.click(screen.getByRole('button', { name: /Store/ }));
    expect(onFocus).toHaveBeenCalledWith('store');
  });
});
