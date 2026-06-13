import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ImageUrlInput } from '../ImageUrlInput';

// Four candidates fit one 2x2 page, so the whole pool renders without paging.
const POOL = [
  'https://img/a.jpg',
  'https://img/b.jpg',
  'https://img/c.jpg',
  'https://img/d.jpg',
];

const tileSrcs = () =>
  screen.getAllByAltText('Product image').map((img) => img.getAttribute('src'));

describe('ImageUrlInput', () => {
  it('NoCandidates_ShowsUrlFieldValue-NoError', () => {
    render(
      <ImageUrlInput value="https://img/a.jpg" error="" onChange={vi.fn()} />
    );
    expect(screen.getByLabelText('Image URL')).toHaveValue('https://img/a.jpg');
  });

  it('NoCandidates_TypeFiresOnChange', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ImageUrlInput value="" error="" onChange={onChange} />);
    await user.type(screen.getByLabelText('Image URL'), 'x');
    expect(onChange).toHaveBeenCalledWith('x');
  });

  it('NoCandidates_RendersErrorMessage', () => {
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

  describe('CandidateGrid', () => {
    it('NoCandidates_RendersNoGridOrImageSearchAffordance', () => {
      render(<ImageUrlInput value="" error="" onChange={vi.fn()} />);
      expect(
        screen.queryByAltText('Product image')
      ).not.toBeInTheDocument();
      expect(screen.queryByText(/Search for an image/)).not.toBeInTheDocument();
    });

    it('SingleCandidate_RendersNoGrid-ShowsUrlField', () => {
      render(
        <ImageUrlInput
          value={POOL[0]}
          error=""
          onChange={vi.fn()}
          candidates={[POOL[0]]}
        />
      );
      expect(screen.queryByAltText('Product image')).not.toBeInTheDocument();
      expect(screen.getByLabelText('Image URL')).toBeInTheDocument();
    });

    it('MultipleCandidates_MarksActiveInPlace-NoReorder', () => {
      render(
        <ImageUrlInput
          value={POOL[1]}
          error=""
          onChange={vi.fn()}
          candidates={POOL}
        />
      );
      // Stable extractor order — the active tile is marked, not moved up.
      expect(tileSrcs()).toEqual(POOL);
      const activeTile = screen.getByRole('button', { current: true });
      expect(within(activeTile).getByAltText('Product image')).toHaveAttribute(
        'src',
        POOL[1]
      );
      expect(within(activeTile).getByText('Current')).toBeInTheDocument();
    });

    it('NonPoolValue_RendersGridInExtractorOrder-NoCurrent', () => {
      render(
        <ImageUrlInput
          value="https://elsewhere/hand.jpg"
          error=""
          onChange={vi.fn()}
          candidates={POOL}
        />
      );
      expect(tileSrcs()).toEqual(POOL);
      expect(screen.queryByText('Current')).not.toBeInTheDocument();
    });

    it('ClickTile_CallsOnChangeWithUrl', async () => {
      const user = userEvent.setup();
      const onChange = vi.fn();
      render(
        <ImageUrlInput
          value={POOL[0]}
          error=""
          onChange={onChange}
          candidates={POOL}
        />
      );
      await user.click(screen.getAllByAltText('Product image')[2]);
      expect(onChange).toHaveBeenCalledWith(POOL[2]);
    });

    it('MultipleCandidates_HidesUrlFieldBehindToggle', async () => {
      const user = userEvent.setup();
      render(
        <ImageUrlInput
          value={POOL[0]}
          error=""
          onChange={vi.fn()}
          candidates={POOL}
        />
      );
      expect(screen.queryByLabelText('Image URL')).not.toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Edit image URL' }));
      expect(screen.getByLabelText('Image URL')).toBeInTheDocument();
    });

    it('CandidatesWithError_ForcesUrlFieldVisibleAlongsideGrid', () => {
      render(
        <ImageUrlInput
          value={POOL[0]}
          error="Please provide a valid image URL"
          onChange={vi.fn()}
          candidates={POOL}
        />
      );
      expect(screen.getAllByAltText('Product image').length).toBeGreaterThan(0);
      expect(screen.getByLabelText('Image URL')).toBeInTheDocument();
      expect(
        screen.getByText('Please provide a valid image URL')
      ).toBeInTheDocument();
    });

    it('Disabled_DisablesEditToggle', () => {
      render(
        <ImageUrlInput
          value={POOL[0]}
          error=""
          onChange={vi.fn()}
          disabled
          candidates={POOL}
        />
      );
      expect(
        screen.getByRole('button', { name: 'Edit image URL' })
      ).toBeDisabled();
    });
  });

  describe('SizeFilter', () => {
    // jsdom never loads images; this stub reports a natural size by URL so the
    // undersized-candidate pruning runs deterministically. URLs containing
    // "tiny" report 40px (below the 200px floor); everything else 400px.
    class SizingImage {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(v: string) {
        queueMicrotask(() => {
          const px = v.includes('tiny') ? 40 : 400;
          this.naturalWidth = px;
          this.naturalHeight = px;
          this.onload?.();
        });
      }
    }

    beforeEach(() => vi.stubGlobal('Image', SizingImage));
    afterEach(() => vi.unstubAllGlobals());

    it('SmallCandidate_PrunedFromGrid', async () => {
      const candidates = [
        'https://img/big-a.jpg',
        'https://m.media-amazon.com/images/I/x._AC_US40_tiny.jpg',
        'https://img/big-b.jpg',
      ];
      render(
        <ImageUrlInput
          value={candidates[0]}
          error=""
          onChange={vi.fn()}
          candidates={candidates}
        />
      );
      await waitFor(() =>
        expect(tileSrcs()).toEqual([candidates[0], candidates[2]])
      );
    });

    it('ActiveSmallKept_OtherSmallPruned', async () => {
      const candidates = [
        'https://img/tiny-active.jpg',
        'https://img/tiny-2.jpg',
        'https://img/big.jpg',
      ];
      render(
        <ImageUrlInput
          value={candidates[0]}
          error=""
          onChange={vi.fn()}
          candidates={candidates}
        />
      );
      await waitFor(() =>
        expect(tileSrcs()).toEqual([candidates[0], candidates[2]])
      );
    });

    it('OnlyOneSurvives_HidesGridShowsUrlField', async () => {
      const candidates = ['https://img/big.jpg', 'https://img/tiny.jpg'];
      render(
        <ImageUrlInput
          value={candidates[0]}
          error=""
          onChange={vi.fn()}
          candidates={candidates}
        />
      );
      await screen.findByLabelText('Image URL');
      expect(screen.queryByAltText('Product image')).not.toBeInTheDocument();
    });

    it('SmallMain_StaysSelectableAfterSwitch', async () => {
      // pool[0] is the extractor's main but undersized; the user has switched
      // the active image to big-a. The small main must remain in the grid, in
      // its original position (no reorder).
      const candidates = [
        'https://img/tiny-main.jpg',
        'https://img/big-a.jpg',
        'https://img/big-b.jpg',
      ];
      render(
        <ImageUrlInput
          value={candidates[1]}
          error=""
          onChange={vi.fn()}
          candidates={candidates}
        />
      );
      await waitFor(() => expect(tileSrcs()).toEqual(candidates));
    });
  });

  describe('LoadFailure', () => {
    // A candidate whose bytes never load (onerror) is unusable; the probe must
    // treat it like an undersized image and prune it. URLs containing "broken"
    // fire onerror; everything else loads at a passing 400px.
    class FailableImage {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(v: string) {
        queueMicrotask(() => {
          if (v.includes('broken')) {
            this.onerror?.();
            return;
          }
          this.naturalWidth = 400;
          this.naturalHeight = 400;
          this.onload?.();
        });
      }
    }

    beforeEach(() => vi.stubGlobal('Image', FailableImage));
    afterEach(() => vi.unstubAllGlobals());

    it('CandidateThatFailsToLoad_PrunedFromGrid', async () => {
      const candidates = [
        'https://img/big-a.jpg',
        'https://img/broken.jpg',
        'https://img/big-b.jpg',
      ];
      render(
        <ImageUrlInput
          value={candidates[0]}
          error=""
          onChange={vi.fn()}
          candidates={candidates}
        />
      );
      await waitFor(() =>
        expect(tileSrcs()).toEqual([candidates[0], candidates[2]])
      );
    });
  });

  describe('StaleProbe', () => {
    // Manual-fire stub: each constructed image is collected so the test can
    // resolve the two pools' probes in a chosen order. "tiny" reports 40px,
    // everything else 400px.
    const instances: { img: { naturalWidth: number; naturalHeight: number; onload: (() => void) | null }; url: string }[] = [];
    class CollectibleImage {
      naturalWidth = 0;
      naturalHeight = 0;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(v: string) {
        instances.push({ img: this, url: v });
      }
    }

    function fireProbes(urls: string[]) {
      for (const { img, url } of instances) {
        if (!urls.includes(url)) continue;
        const px = url.includes('tiny') ? 40 : 400;
        img.naturalWidth = px;
        img.naturalHeight = px;
        img.onload?.();
      }
    }

    beforeEach(() => {
      instances.length = 0;
      vi.stubGlobal('Image', CollectibleImage);
    });
    afterEach(() => vi.unstubAllGlobals());

    it('PoolChangedMidProbe_IgnoresStalePrune', async () => {
      const pool1 = [
        'https://img/big-1.jpg',
        'https://img/tiny-1.jpg',
        'https://img/big-1b.jpg',
      ];
      const pool2 = [
        'https://img/big-2.jpg',
        'https://img/tiny-2.jpg',
        'https://img/big-2b.jpg',
      ];
      const { rerender } = render(
        <ImageUrlInput
          value={pool1[0]}
          error=""
          onChange={vi.fn()}
          candidates={pool1}
        />
      );
      rerender(
        <ImageUrlInput
          value={pool2[0]}
          error=""
          onChange={vi.fn()}
          candidates={pool2}
        />
      );
      // Resolve the live pool first, then the superseded one. The stale result
      // must be discarded — only pool2's pruning (tiny-2 dropped) may apply.
      await act(async () => fireProbes(pool2));
      await act(async () => fireProbes(pool1));
      expect(tileSrcs()).toEqual([pool2[0], pool2[2]]);
    });
  });
});
