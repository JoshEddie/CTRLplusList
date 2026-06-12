import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageSearch } from '../ImageSearch';

const RESULT = {
  link: 'https://cdn/full.jpg',
  title: 'A Mug',
  image: {
    byteSize: 1,
    contextLink: 'https://x',
    height: 100,
    thumbnailLink: 'https://cdn/thumb.jpg',
    width: 100,
  },
};

function renderSearch(
  overrides: Partial<React.ComponentProps<typeof ImageSearch>> = {}
) {
  const props = {
    isOpen: true,
    onClose: vi.fn(),
    onSelectImage: vi.fn(),
    searchResults: [] as never[],
    setSearchResults: vi.fn(),
    searchTerm: 'mug',
    setSearchTerm: vi.fn(),
    ...overrides,
  };
  const utils = render(<ImageSearch {...props} />);
  return { ...utils, props };
}

function mockFetch(response: {
  ok?: boolean;
  status?: number;
  data?: unknown;
}) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: response.ok ?? true,
    status: response.status ?? 200,
    json: () => Promise.resolve(response.data ?? {}),
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const searchButton = () =>
  // eslint-disable-next-line testing-library/no-node-access -- the icon-only `.search-button` has no accessible name; a classed document.querySelector is the only path.
  document.querySelector('.search-button') as HTMLButtonElement;

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('ImageSearch', () => {
  it('Closed_RendersNothing', () => {
    const { container } = renderSearch({ isOpen: false });
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('Open_RendersDialogWithSearchField', () => {
    renderSearch();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Search for an image' })).toBeInTheDocument();
    expect(screen.getByRole('searchbox')).toBeInTheDocument();
  });

  it('TypeSearchTerm_FiresSetSearchTerm', async () => {
    const user = userEvent.setup();
    const { props } = renderSearch({ searchTerm: '' });
    await user.type(screen.getByRole('searchbox'), 'x');
    expect(props.setSearchTerm).toHaveBeenCalledWith('x');
  });

  it('CloseButton_FiresOnClose', async () => {
    const user = userEvent.setup();
    const { props } = renderSearch();
    await user.click(
      screen.getByRole('button', { name: 'Close image search' })
    );
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('BackdropClick_FiresOnClose', async () => {
    const user = userEvent.setup();
    const { props } = renderSearch();
    await user.click(screen.getByRole('dialog'));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('EscapeKey_FiresOnClose', async () => {
    const user = userEvent.setup();
    const { props } = renderSearch();
    await user.keyboard('{Escape}');
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('SearchSuccess_SetsResultsWithQueryEncoded', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({ data: { items: [RESULT] } });
    const { props } = renderSearch({ searchTerm: 'red mug' });
    await user.click(searchButton());
    await waitFor(() =>
      expect(props.setSearchResults).toHaveBeenCalledWith([RESULT])
    );
    expect(fetchMock).toHaveBeenCalledWith('/api/image-search?q=red%20mug');
  });

  it('SearchEmptyResults_ShowsNoImagesError', async () => {
    const user = userEvent.setup();
    mockFetch({ data: { items: [] } });
    const { props } = renderSearch();
    await user.click(searchButton());
    expect(
      await screen.findByText('No images found. Try a different search term.')
    ).toBeInTheDocument();
    expect(props.setSearchResults).toHaveBeenCalledWith([]);
  });

  it('RateLimited429_ShowsTemporarilyUnavailable', async () => {
    const user = userEvent.setup();
    mockFetch({ ok: false, status: 429, data: { error: 'rate_limited' } });
    const { props } = renderSearch();
    await user.click(searchButton());
    expect(
      await screen.findByText(
        'Image search is temporarily unavailable. Please paste an image URL instead.'
      )
    ).toBeInTheDocument();
    expect(props.setSearchResults).toHaveBeenCalledWith([]);
  });

  it('QuotaExceeded_ShowsTemporarilyUnavailable', async () => {
    const user = userEvent.setup();
    mockFetch({ ok: true, status: 200, data: { error: 'quota_exceeded' } });
    renderSearch();
    await user.click(searchButton());
    expect(
      await screen.findByText(
        'Image search is temporarily unavailable. Please paste an image URL instead.'
      )
    ).toBeInTheDocument();
  });

  it('MalformedJson_TreatedAsEmptyResults', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.reject(new Error('bad json')),
    });
    vi.stubGlobal('fetch', fetchMock);
    renderSearch();
    await user.click(searchButton());
    expect(
      await screen.findByText('No images found. Try a different search term.')
    ).toBeInTheDocument();
  });

  it('NotOkResponse_ShowsGenericError', async () => {
    const user = userEvent.setup();
    mockFetch({ ok: false, status: 500, data: {} });
    renderSearch();
    await user.click(searchButton());
    expect(
      await screen.findByText('Failed to load images. Please try again later.')
    ).toBeInTheDocument();
  });

  it('FetchRejects_ShowsGenericError', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockRejectedValue(new Error('network'));
    vi.stubGlobal('fetch', fetchMock);
    renderSearch();
    await user.click(searchButton());
    expect(
      await screen.findByText('Failed to load images. Please try again later.')
    ).toBeInTheDocument();
  });

  it('EnterKey_RunsSearch', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({ data: { items: [RESULT] } });
    renderSearch();
    screen.getByRole('searchbox').focus();
    await user.keyboard('{Enter}');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it('EmptyTerm_EnterDoesNotFetch', async () => {
    const user = userEvent.setup();
    const fetchMock = mockFetch({ data: { items: [] } });
    renderSearch({ searchTerm: '   ' });
    screen.getByRole('searchbox').focus();
    await user.keyboard('{Enter}');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('Results_RenderViewer-SelectFiresOnSelectImage', async () => {
    const user = userEvent.setup();
    const { props } = renderSearch({ searchResults: [RESULT] as never });
    await user.click(screen.getByTitle('A Mug'));
    expect(props.onSelectImage).toHaveBeenCalledWith('https://cdn/full.jpg');
  });

  it('Disabled_DisablesSearchInputAndButton', () => {
    renderSearch({ disabled: true });
    expect(screen.getByRole('searchbox')).toBeDisabled();
    expect(searchButton()).toBeDisabled();
  });
});
