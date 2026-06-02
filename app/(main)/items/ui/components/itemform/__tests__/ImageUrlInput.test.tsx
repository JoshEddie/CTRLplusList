import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImageUrlInput } from '../ImageUrlInput';

// Stub the portal modal: surface its open state and expose a way to fire the
// selection callback so ImageUrlInput's handleImageSelect is exercised.
vi.mock('../ImageSearch', () => ({
  ImageSearch: (p: {
    isOpen: boolean;
    onSelectImage: (url: string) => void;
    onClose: () => void;
  }) => (
    <div data-testid="image-search" data-open={String(p.isOpen)}>
      <button type="button" onClick={() => p.onSelectImage('https://img/pick.jpg')}>
        pick
      </button>
      <button type="button" onClick={() => p.onClose()}>
        close
      </button>
    </div>
  ),
}));

describe('ImageUrlInput', () => {
  it('Value_ShownInInput-NoError', () => {
    render(
      <ImageUrlInput value="https://img/a.jpg" error="" onChange={vi.fn()} />
    );
    expect(screen.getByLabelText('Image URL')).toHaveValue('https://img/a.jpg');
  });

  it('Type_FiresOnChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ImageUrlInput value="" error="" onChange={onChange} />);
    await user.type(screen.getByLabelText('Image URL'), 'x');
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('Error_RendersErrorMessage', () => {
    render(
      <ImageUrlInput
        value=""
        error="Please provide a valid image URL"
        onChange={vi.fn()}
      />
    );
    expect(
      screen.getByText('Please provide a valid image URL')
    ).toBeInTheDocument();
  });

  it('ClickSearch_OpensImageSearch', async () => {
    const user = userEvent.setup();
    render(<ImageUrlInput value="" error="" onChange={vi.fn()} />);
    expect(screen.getByTestId('image-search')).toHaveAttribute(
      'data-open',
      'false'
    );
    await user.click(
      screen.getByRole('button', { name: /Search for an image/ })
    );
    expect(screen.getByTestId('image-search')).toHaveAttribute(
      'data-open',
      'true'
    );
  });

  it('SelectImage_CallsOnChange-ClosesSearch', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ImageUrlInput value="" error="" onChange={onChange} />);
    await user.click(
      screen.getByRole('button', { name: /Search for an image/ })
    );
    await user.click(screen.getByRole('button', { name: 'pick' }));
    expect(onChange).toHaveBeenCalledWith('https://img/pick.jpg');
    expect(screen.getByTestId('image-search')).toHaveAttribute(
      'data-open',
      'false'
    );
  });

  it('ModalClose_SetsSearchClosed', async () => {
    const user = userEvent.setup();
    render(<ImageUrlInput value="" error="" onChange={vi.fn()} />);
    await user.click(
      screen.getByRole('button', { name: /Search for an image/ })
    );
    expect(screen.getByTestId('image-search')).toHaveAttribute(
      'data-open',
      'true'
    );
    await user.click(screen.getByRole('button', { name: 'close' }));
    expect(screen.getByTestId('image-search')).toHaveAttribute(
      'data-open',
      'false'
    );
  });

  it('Disabled_DisablesInputAndSearchButton', () => {
    render(<ImageUrlInput value="" error="" onChange={vi.fn()} disabled />);
    expect(screen.getByLabelText('Image URL')).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /Search for an image/ })
    ).toBeDisabled();
  });
});
