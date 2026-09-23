import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PhotoEditor } from '../PhotoEditor';
import { MAX_IMAGE_CANDIDATES } from '@/lib/imageCandidates';
import { DEFAULT_FRAMING, type ImageFraming } from '@/lib/imageFraming';

// The pool reaching PhotoEditor is already pruned upstream (prunePhotos at
// fetch time), so this only tests presentation/selection of what it's given.
const POOL = ['https://img/a.jpg', 'https://img/b.jpg', 'https://img/c.jpg'];
const ART = [
  'data:image/svg+xml;base64,YXJ0MQ==',
  'data:image/svg+xml;base64,YXJ0Mg==',
];

function renderEditor(
  overrides: Partial<React.ComponentProps<typeof PhotoEditor>> = {}
) {
  const props = {
    photos: POOL,
    photoIndex: 0,
    placeholders: [] as string[],
    selectedPlaceholder: null,
    onSelect: vi.fn(),
    onSelectPlaceholder: vi.fn(),
    onReroll: vi.fn(),
    onAddPhoto: vi.fn(),
    framing: null as ImageFraming | null,
    onFramingChange: vi.fn(),
    ...overrides,
  };
  render(<PhotoEditor {...props} />);
  return props;
}

describe('PhotoEditor', () => {
  describe('ZeroPhotos', () => {
    it('WithPlaceholders_ShowsStageAndAllArtStrip-NoDeadEnd', () => {
      renderEditor({ photos: [], placeholders: ART });
      expect(screen.queryByText(/couldn't find/i)).not.toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Use artwork 1' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Use artwork 2' })
      ).toBeInTheDocument();
      expect(screen.getByLabelText('Add an image by URL')).toBeInTheDocument();
    });

    it('NothingSelected_StageFrameIsEmpty', () => {
      renderEditor({ photos: [], placeholders: ART });
      expect(
        screen.queryByAltText('Selected product image')
      ).not.toBeInTheDocument();
    });
  });

  describe('MultiplePhotos', () => {
    it('Render_StageShowsActivePhoto', () => {
      renderEditor({ photoIndex: 1 });
      expect(screen.getByAltText('Selected product image')).toHaveAttribute(
        'src',
        POOL[1]
      );
    });

    it('Render_StripShowsEveryPhoto', () => {
      renderEditor();
      expect(
        screen.getByRole('button', { name: 'Use image 3' })
      ).toBeInTheDocument();
    });

    it('ClickThumbnail_CallsOnSelectWithIndex', async () => {
      const user = userEvent.setup();
      const { onSelect } = renderEditor();
      await user.click(screen.getByRole('button', { name: 'Use image 3' }));
      expect(onSelect).toHaveBeenCalledWith(2);
    });

    it('ClickNext_CallsOnSelectWithNextIndex', async () => {
      const user = userEvent.setup();
      const { onSelect } = renderEditor();
      await user.click(screen.getByRole('button', { name: 'Next image' }));
      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it('ClickPrevFromFirst_WrapsToLast', async () => {
      const user = userEvent.setup();
      const { onSelect } = renderEditor();
      await user.click(screen.getByRole('button', { name: 'Previous image' }));
      expect(onSelect).toHaveBeenCalledWith(2);
    });
  });

  describe('PlaceholderThumbs', () => {
    it('Render_AppendsArtThumbsAfterRealPhotos', () => {
      renderEditor({ placeholders: ART });
      const art = screen.getByRole('button', { name: 'Use artwork 1' });
      const thumbs = screen.getAllByRole('button', { name: /Use / });
      expect(thumbs).toHaveLength(POOL.length + ART.length);
      expect(thumbs[POOL.length]).toBe(art);
    });

    it('ClickArtThumb_CallsOnSelectPlaceholderWithUri', async () => {
      const user = userEvent.setup();
      const { onSelectPlaceholder } = renderEditor({ placeholders: ART });
      await user.click(
        screen.getByRole('button', { name: 'Use artwork 2' })
      );
      expect(onSelectPlaceholder).toHaveBeenCalledWith(ART[1]);
    });

    it('ArtSelected_StageShowsArtAndThumbReadsActive', () => {
      renderEditor({ placeholders: ART, selectedPlaceholder: ART[0] });
      expect(screen.getByAltText('Selected product image')).toHaveAttribute(
        'src',
        ART[0]
      );
      expect(
        screen.getByRole('button', { name: 'Use artwork 1' })
      ).toHaveAttribute('aria-pressed', 'true');
      expect(
        screen.getByRole('button', { name: 'Use image 1' })
      ).toHaveAttribute('aria-pressed', 'false');
    });

    it('ClickNextFromLastRealPhoto_SelectsFirstArtThumb', async () => {
      const user = userEvent.setup();
      const { onSelectPlaceholder } = renderEditor({
        photoIndex: 2,
        placeholders: ART,
      });
      await user.click(screen.getByRole('button', { name: 'Next image' }));
      expect(onSelectPlaceholder).toHaveBeenCalledWith(ART[0]);
    });

    it('ClickNextFromLastArtThumb_WrapsToFirstRealPhoto', async () => {
      const user = userEvent.setup();
      const { onSelect } = renderEditor({
        placeholders: ART,
        selectedPlaceholder: ART[1],
      });
      await user.click(screen.getByRole('button', { name: 'Next image' }));
      expect(onSelect).toHaveBeenCalledWith(0);
    });
  });

  describe('Reroll', () => {
    it('ArtSelected_ShowsRerollAndClickCallsOnReroll', async () => {
      const user = userEvent.setup();
      const { onReroll } = renderEditor({
        placeholders: ART,
        selectedPlaceholder: ART[0],
      });
      await user.click(
        screen.getByRole('button', { name: 'Reroll artwork' })
      );
      expect(onReroll).toHaveBeenCalledTimes(1);
    });

    it('RealPhotoSelected_HidesReroll', () => {
      renderEditor({ placeholders: ART });
      expect(
        screen.queryByRole('button', { name: 'Reroll artwork' })
      ).not.toBeInTheDocument();
    });
  });

  describe('OutOfRangeIndex', () => {
    it('ActiveBeyondPool_NextSelectsFirstVisibleNext', async () => {
      const user = userEvent.setup();
      const { onSelect } = renderEditor({ photoIndex: 5 });
      await user.click(screen.getByRole('button', { name: 'Next image' }));
      expect(onSelect).toHaveBeenCalledWith(1);
    });
  });

  describe('SinglePhoto', () => {
    it('NoPlaceholders_NoNavButtonsNoStrip', () => {
      renderEditor({ photos: [POOL[0]] });
      expect(
        screen.queryByRole('button', { name: 'Next image' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Use image 1' })
      ).not.toBeInTheDocument();
    });

    it('WithPlaceholders_ShowsNavAndStrip', () => {
      renderEditor({ photos: [POOL[0]], placeholders: ART });
      expect(
        screen.getByRole('button', { name: 'Next image' })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: 'Use image 1' })
      ).toBeInTheDocument();
    });
  });

  describe('Disabled', () => {
    it('Render_DisablesNavAndAdd', () => {
      renderEditor({ disabled: true });
      expect(screen.getByRole('button', { name: 'Next image' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Add image' })).toBeDisabled();
    });
  });

  describe('AddByUrl', () => {
    it('ValidUrl_CallsOnAddPhoto-ClearsInput', async () => {
      const user = userEvent.setup();
      const { onAddPhoto } = renderEditor();
      const input = screen.getByLabelText('Add an image by URL');
      await user.type(input, 'https://img/new.jpg');
      await user.click(screen.getByRole('button', { name: 'Add image' }));
      expect(onAddPhoto).toHaveBeenCalledWith('https://img/new.jpg');
      expect(input).toHaveValue('');
    });

    it('InvalidUrl_ShowsError-DoesNotCallOnAddPhoto', async () => {
      const user = userEvent.setup();
      const { onAddPhoto } = renderEditor();
      await user.type(screen.getByLabelText('Add an image by URL'), 'not a url');
      await user.click(screen.getByRole('button', { name: 'Add image' }));
      expect(screen.getByText(/valid image URL/i)).toBeInTheDocument();
      expect(onAddPhoto).not.toHaveBeenCalled();
    });
  });

  describe('AtCap', () => {
    it('FullRealPool_ShowsCapMessage-HidesAddField', () => {
      const full = Array.from(
        { length: MAX_IMAGE_CANDIDATES },
        (_, i) => `https://img/${i}.jpg`
      );
      renderEditor({ photos: full });
      expect(
        screen.getByText(
          new RegExp(`maximum of ${MAX_IMAGE_CANDIDATES} images`, 'i')
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText('Add an image by URL')
      ).not.toBeInTheDocument();
    });

    it('FullRealPoolPlusSavedPlaceholder_StillCountsOnlyRealPhotos', () => {
      const full = Array.from(
        { length: MAX_IMAGE_CANDIDATES - 1 },
        (_, i) => `https://img/${i}.jpg`
      );
      renderEditor({ photos: [...full, ART[0]] });
      expect(screen.getByLabelText('Add an image by URL')).toBeInTheDocument();
    });
  });

  describe('Framing', () => {
    const panner = () => screen.getByRole('button', { name: /Photo position/ });

    // jsdom lays nothing out, so the image's natural size and the frame's
    // box are stated; pointer capture is a browser behaviour jsdom lacks.
    function layOut(natural: [number, number]) {
      const img = screen.getByAltText('Selected product image');
      Object.defineProperties(img, {
        naturalWidth: { value: natural[0] },
        naturalHeight: { value: natural[1] },
      });
      const button = panner();
      button.setPointerCapture = vi.fn();
      vi.spyOn(button, 'getBoundingClientRect').mockReturnValue({
        left: 0,
        top: 0,
        width: 400,
        height: 300,
      } as DOMRect);
    }

    const dragFrom100 = (to: { clientX: number; clientY: number }) => {
      fireEvent.pointerDown(panner(), { clientX: 200, clientY: 100 });
      fireEvent.pointerMove(panner(), to);
    };

    it('NoFraming_OffersNeitherControl', () => {
      renderEditor();
      expect(
        screen.queryByRole('radiogroup', {
          name: 'How the photo sits in its card',
        })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Photo position/ })
      ).not.toBeInTheDocument();
    });

    it('FilledPhoto_PreviewCropsAtStoredPosition', () => {
      renderEditor({ framing: { focal_x: 20, focal_y: 80, fit: 'cover' } });
      expect(screen.getByAltText('Selected product image')).toHaveStyle({
        objectFit: 'cover',
        objectPosition: '20% 80%',
      });
    });

    // A 1:2 photo filling a 400×300 frame renders 400×800: 500px of vertical
    // slack, none horizontal.
    const renderLaidOut = (natural: [number, number]) => {
      const view = renderEditor({ framing: DEFAULT_FRAMING });
      layOut(natural);
      return view;
    };

    describe('FilledTallPhoto', () => {

      it('DraggedDown_RevealsTopByDragOverSlack', () => {
        const { onFramingChange } = renderLaidOut([300, 600]);
        dragFrom100({ clientX: 200, clientY: 200 });
        expect(onFramingChange).toHaveBeenLastCalledWith({
          focal_x: 50,
          focal_y: 30,
          fit: 'cover',
        });
      });

      it('DraggedSideways_UncroppedAxisStaysPut', () => {
        const { onFramingChange } = renderLaidOut([300, 600]);
        dragFrom100({ clientX: 350, clientY: 100 });
        expect(onFramingChange).toHaveBeenLastCalledWith(DEFAULT_FRAMING);
      });

      it('DraggedPastEdge_ClampsAtTop', () => {
        const { onFramingChange } = renderLaidOut([300, 600]);
        dragFrom100({ clientX: 200, clientY: 2000 });
        expect(onFramingChange).toHaveBeenLastCalledWith({
          focal_x: 50,
          focal_y: 0,
          fit: 'cover',
        });
      });

      it('PointerReleased_LaterMoveReportsNothing', () => {
        const { onFramingChange } = renderLaidOut([300, 600]);
        fireEvent.pointerDown(panner(), { clientX: 200, clientY: 100 });
        fireEvent.pointerUp(panner());
        fireEvent.pointerMove(panner(), { clientX: 200, clientY: 200 });
        expect(onFramingChange).not.toHaveBeenCalled();
      });

      it('ArrowDown_MovesPhotoDownLikeADrag', () => {
        const { onFramingChange } = renderLaidOut([300, 600]);
        fireEvent.keyDown(panner(), { key: 'ArrowDown' });
        expect(onFramingChange).toHaveBeenCalledWith({
          focal_x: 50,
          focal_y: 45,
          fit: 'cover',
        });
      });

      it('ArrowRight_UncroppedAxisStaysPut', () => {
        const { onFramingChange } = renderLaidOut([300, 600]);
        fireEvent.keyDown(panner(), { key: 'ArrowRight' });
        expect(onFramingChange).toHaveBeenCalledWith(DEFAULT_FRAMING);
      });

      it('NonArrowKey_ReportsNothing', () => {
        const { onFramingChange } = renderLaidOut([300, 600]);
        fireEvent.keyDown(panner(), { key: 'a' });
        expect(onFramingChange).not.toHaveBeenCalled();
      });
    });

    describe('UnloadedPhoto', () => {

      it('Drag_ReportsNothing', () => {
        const { onFramingChange } = renderLaidOut([0, 0]);
        dragFrom100({ clientX: 200, clientY: 200 });
        expect(onFramingChange).not.toHaveBeenCalled();
      });

      it('ArrowKey_ReportsNothing', () => {
        const { onFramingChange } = renderLaidOut([0, 0]);
        fireEvent.keyDown(panner(), { key: 'ArrowDown' });
        expect(onFramingChange).not.toHaveBeenCalled();
      });
    });

    it('FitChosen_ReportsContainKeepingPosition', async () => {
      const { onFramingChange } = renderEditor({
        framing: { focal_x: 20, focal_y: 80, fit: 'cover' },
      });
      await userEvent.click(screen.getByRole('radio', { name: 'Fit' }));
      expect(onFramingChange).toHaveBeenCalledWith({
        focal_x: 20,
        focal_y: 80,
        fit: 'contain',
      });
    });

    it('FittedPhoto_NoPanControl', () => {
      renderEditor({ framing: { ...DEFAULT_FRAMING, fit: 'contain' } });
      expect(screen.getByRole('radio', { name: 'Fit' })).toBeChecked();
      expect(
        screen.queryByRole('button', { name: /Photo position/ })
      ).not.toBeInTheDocument();
    });
  });
});
