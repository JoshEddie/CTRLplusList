import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImageCandidateGrid } from '../ImageCandidateGrid';

const six = Array.from({ length: 6 }, (_, i) => `https://img/${i}.jpg`);

const tileSrcs = () =>
  screen.getAllByAltText('Product image').map((img) => img.getAttribute('src'));

describe('ImageCandidateGrid', () => {
  it('SinglePage_RendersNoNavArrows-NoPadding', () => {
    render(
      <ImageCandidateGrid candidates={six.slice(0, 3)} onSelect={vi.fn()} />
    );
    expect(
      screen.queryByRole('button', { name: 'More images' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Previous images' })
    ).not.toBeInTheDocument();
    expect(tileSrcs()).toEqual(six.slice(0, 3));
    // A lone page renders exactly its tiles — no filler cells.
    expect(screen.queryAllByTestId('cand-placeholder')).toHaveLength(0);
  });

  it('ShortFinalPage_PadsToFullGrid', async () => {
    const user = userEvent.setup();
    render(<ImageCandidateGrid candidates={six} onSelect={vi.fn()} />);
    await user.click(screen.getByRole('button', { name: 'More images' }));
    // Last page holds 2 real tiles plus 2 fillers — a stable 4-cell footprint.
    expect(tileSrcs()).toEqual(six.slice(4));
    expect(screen.getAllByTestId('cand-placeholder')).toHaveLength(2);
  });

  it('ActiveCandidate_MarkedInPlace-NoReorder', () => {
    render(
      <ImageCandidateGrid
        candidates={six.slice(0, 4)}
        activeUrl={six[2]}
        onSelect={vi.fn()}
      />
    );
    // Order is the extractor order — the active tile is NOT moved to the front.
    expect(tileSrcs()).toEqual(six.slice(0, 4));
    const activeTile = screen.getByRole('button', { current: true });
    expect(within(activeTile).getByAltText('Product image')).toHaveAttribute(
      'src',
      six[2]
    );
    expect(within(activeTile).getByText('Current')).toBeInTheDocument();
  });

  it('ClickTile_CallsOnSelectWithUrl', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ImageCandidateGrid candidates={six.slice(0, 4)} onSelect={onSelect} />
    );
    await user.click(screen.getAllByAltText('Product image')[1]);
    expect(onSelect).toHaveBeenCalledWith(six[1]);
  });

  it('SixCandidates_PaginateByFour', async () => {
    const user = userEvent.setup();
    render(<ImageCandidateGrid candidates={six} onSelect={vi.fn()} />);
    expect(tileSrcs()).toEqual(six.slice(0, 4));
    await user.click(screen.getByRole('button', { name: 'More images' }));
    expect(tileSrcs()).toEqual(six.slice(4));
    await user.click(screen.getByRole('button', { name: 'Previous images' }));
    expect(tileSrcs()).toEqual(six.slice(0, 4));
  });

  it('ActiveOnLaterPage_OpensThatPage', () => {
    render(
      <ImageCandidateGrid candidates={six} activeUrl={six[4]} onSelect={vi.fn()} />
    );
    expect(tileSrcs()).toEqual(six.slice(4));
  });

  it('FirstPage_PreviousDisabled', () => {
    render(<ImageCandidateGrid candidates={six} onSelect={vi.fn()} />);
    expect(
      screen.getByRole('button', { name: 'Previous images' })
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'More images' })).toBeEnabled();
  });

  it('EnterKeyOnTile_CallsOnSelectWithUrl', () => {
    const onSelect = vi.fn();
    render(
      <ImageCandidateGrid candidates={six.slice(0, 4)} onSelect={onSelect} />
    );
    fireEvent.keyDown(screen.getAllByRole('button')[1], { key: 'Enter' });
    expect(onSelect).toHaveBeenCalledWith(six[1]);
  });

  it('NonEnterKeyOnTile_DoesNotSelect', () => {
    const onSelect = vi.fn();
    render(
      <ImageCandidateGrid candidates={six.slice(0, 4)} onSelect={onSelect} />
    );
    fireEvent.keyDown(screen.getAllByRole('button')[1], { key: 'a' });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('DisabledEnterKey_DoesNotSelect', () => {
    const onSelect = vi.fn();
    render(
      <ImageCandidateGrid
        candidates={six.slice(0, 4)}
        onSelect={onSelect}
        disabled
      />
    );
    fireEvent.keyDown(screen.getAllByRole('button')[0], { key: 'Enter' });
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('Disabled_DisablesNav-IgnoresTileClicks', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <ImageCandidateGrid candidates={six} onSelect={onSelect} disabled />
    );
    expect(screen.getByRole('button', { name: 'More images' })).toBeDisabled();
    await user.click(screen.getAllByAltText('Product image')[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
