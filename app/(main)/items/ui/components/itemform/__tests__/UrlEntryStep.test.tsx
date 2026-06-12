import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { UrlEntryStep } from '../UrlEntryStep';
import { isValidProductUrl } from '../utils';

const INVALID_MSG = 'Please enter a valid product link (http or https)';

function renderStep(
  props: Partial<{
    initialUrl: string;
    initialError: string;
    onFetch: ReturnType<typeof vi.fn>;
    onManual: ReturnType<typeof vi.fn>;
  }> = {}
) {
  const onFetch = props.onFetch ?? vi.fn();
  const onManual = props.onManual ?? vi.fn();
  render(
    <UrlEntryStep
      initialUrl={props.initialUrl}
      initialError={props.initialError}
      onFetch={onFetch as never}
      onManual={onManual as never}
    />
  );
  return { onFetch, onManual };
}

describe('isValidProductUrl', () => {
  it('HttpsUrl_ReturnsTrue', () => {
    expect(isValidProductUrl('https://www.amazon.com/x')).toBe(true);
  });

  it('HttpUrl_ReturnsTrue', () => {
    expect(isValidProductUrl('http://example.com')).toBe(true);
  });

  it('FtpUrl_ReturnsFalse', () => {
    expect(isValidProductUrl('ftp://example.com/file')).toBe(false);
  });

  it('NonUrlString_ReturnsFalse', () => {
    expect(isValidProductUrl('not a url')).toBe(false);
  });
});

describe('UrlEntryStep', () => {
  it('ValidUrlClickFetch_CallsOnFetchWithTrimmedUrl', () => {
    const { onFetch } = renderStep({
      initialUrl: '  https://www.amazon.com/x  ',
    });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Details' }));
    expect(onFetch).toHaveBeenCalledWith('https://www.amazon.com/x');
  });

  it('InvalidUrlClickFetch_ShowsInvalidLinkError-NoOnFetch', () => {
    const { onFetch } = renderStep({ initialUrl: 'notaurl' });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Details' }));
    expect(screen.getByText(INVALID_MSG)).toBeInTheDocument();
    expect(onFetch).not.toHaveBeenCalled();
  });

  it('EnterKeyValidUrl_CallsOnFetch', () => {
    const { onFetch } = renderStep({ initialUrl: 'https://www.target.com/p' });
    fireEvent.keyDown(screen.getByLabelText('Product link'), { key: 'Enter' });
    expect(onFetch).toHaveBeenCalledWith('https://www.target.com/p');
  });

  it('InitialErrorProp_RendersError', () => {
    renderStep({ initialError: 'Fetch failed, try again' });
    expect(screen.getByText('Fetch failed, try again')).toBeInTheDocument();
  });

  it('TypeAfterInvalidUrl_ClearsError', async () => {
    const user = userEvent.setup();
    renderStep({ initialUrl: 'notaurl' });
    fireEvent.click(screen.getByRole('button', { name: 'Fetch Details' }));
    expect(screen.getByText(INVALID_MSG)).toBeInTheDocument();
    await user.type(screen.getByLabelText('Product link'), 'x');
    expect(screen.queryByText(INVALID_MSG)).not.toBeInTheDocument();
  });

  it('ClickManual_CallsOnManual', () => {
    const { onManual } = renderStep();
    fireEvent.click(
      screen.getByRole('button', { name: 'Fill in details manually →' })
    );
    expect(onManual).toHaveBeenCalledTimes(1);
  });
});
