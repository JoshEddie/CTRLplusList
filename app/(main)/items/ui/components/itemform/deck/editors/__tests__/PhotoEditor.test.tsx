import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PhotoEditor } from '../PhotoEditor';
import { MAX_IMAGE_CANDIDATES } from '@/lib/imageCandidates';

// The pool reaching PhotoEditor is already pruned upstream (prunePhotos at
// fetch time), so this only tests presentation/selection of what it's given.
const POOL = ['https://img/a.jpg', 'https://img/b.jpg', 'https://img/c.jpg'];

describe('PhotoEditor', () => {
  describe('ZeroPhotos', () => {
    it('Render_ShowsCouldNotFindMessage-AddField', () => {
      render(
        <PhotoEditor
          photos={[]}
          photoIndex={0}
          onSelect={vi.fn()}
          onAddPhoto={vi.fn()}
        />
      );
      expect(screen.getByText(/couldn't find any images/i)).toBeInTheDocument();
      expect(screen.getByLabelText('Add an image by URL')).toBeInTheDocument();
      expect(
        screen.queryByAltText('Selected product image')
      ).not.toBeInTheDocument();
    });
  });

  describe('MultiplePhotos', () => {
    it('Render_StageShowsActivePhoto', () => {
      render(
        <PhotoEditor
          photos={POOL}
          photoIndex={1}
          onSelect={vi.fn()}
          onAddPhoto={vi.fn()}
        />
      );
      expect(screen.getByAltText('Selected product image')).toHaveAttribute(
        'src',
        POOL[1]
      );
    });

    it('Render_StripShowsEveryPhoto', () => {
      render(
        <PhotoEditor
          photos={POOL}
          photoIndex={0}
          onSelect={vi.fn()}
          onAddPhoto={vi.fn()}
        />
      );
      expect(
        screen.getByRole('button', { name: 'Use image 3' })
      ).toBeInTheDocument();
    });

    it('ClickThumbnail_CallsOnSelectWithIndex', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <PhotoEditor
          photos={POOL}
          photoIndex={0}
          onSelect={onSelect}
          onAddPhoto={vi.fn()}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Use image 3' }));
      expect(onSelect).toHaveBeenCalledWith(2);
    });

    it('ClickNext_CallsOnSelectWithNextIndex', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <PhotoEditor
          photos={POOL}
          photoIndex={0}
          onSelect={onSelect}
          onAddPhoto={vi.fn()}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Next image' }));
      expect(onSelect).toHaveBeenCalledWith(1);
    });

    it('ClickPrevFromFirst_WrapsToLast', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <PhotoEditor
          photos={POOL}
          photoIndex={0}
          onSelect={onSelect}
          onAddPhoto={vi.fn()}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Previous image' }));
      expect(onSelect).toHaveBeenCalledWith(2);
    });
  });

  describe('OutOfRangeIndex', () => {
    it('ActiveBeyondPool_NextSelectsFirstVisibleNext', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      render(
        <PhotoEditor
          photos={POOL}
          photoIndex={5}
          onSelect={onSelect}
          onAddPhoto={vi.fn()}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Next image' }));
      expect(onSelect).toHaveBeenCalledWith(1);
    });
  });

  describe('SinglePhoto', () => {
    it('Render_NoNavButtonsNoStrip', () => {
      render(
        <PhotoEditor
          photos={[POOL[0]]}
          photoIndex={0}
          onSelect={vi.fn()}
          onAddPhoto={vi.fn()}
        />
      );
      expect(
        screen.queryByRole('button', { name: 'Next image' })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Use image 1' })
      ).not.toBeInTheDocument();
    });
  });

  describe('Disabled', () => {
    it('Render_DisablesNavAndAdd', () => {
      render(
        <PhotoEditor
          photos={POOL}
          photoIndex={0}
          onSelect={vi.fn()}
          onAddPhoto={vi.fn()}
          disabled
        />
      );
      expect(screen.getByRole('button', { name: 'Next image' })).toBeDisabled();
      expect(screen.getByRole('button', { name: 'Add image' })).toBeDisabled();
    });
  });

  describe('AddByUrl', () => {
    it('ValidUrl_CallsOnAddPhoto-ClearsInput', async () => {
      const user = userEvent.setup();
      const onAddPhoto = vi.fn();
      render(
        <PhotoEditor
          photos={POOL}
          photoIndex={0}
          onSelect={vi.fn()}
          onAddPhoto={onAddPhoto}
        />
      );
      const input = screen.getByLabelText('Add an image by URL');
      await user.type(input, 'https://img/new.jpg');
      await user.click(screen.getByRole('button', { name: 'Add image' }));
      expect(onAddPhoto).toHaveBeenCalledWith('https://img/new.jpg');
      expect(input).toHaveValue('');
    });

    it('InvalidUrl_ShowsError-DoesNotCallOnAddPhoto', async () => {
      const user = userEvent.setup();
      const onAddPhoto = vi.fn();
      render(
        <PhotoEditor
          photos={POOL}
          photoIndex={0}
          onSelect={vi.fn()}
          onAddPhoto={onAddPhoto}
        />
      );
      await user.type(screen.getByLabelText('Add an image by URL'), 'not a url');
      await user.click(screen.getByRole('button', { name: 'Add image' }));
      expect(screen.getByText(/valid image URL/i)).toBeInTheDocument();
      expect(onAddPhoto).not.toHaveBeenCalled();
    });
  });

  describe('AtCap', () => {
    it('Render_ShowsCapMessage-HidesAddField', () => {
      const full = Array.from(
        { length: MAX_IMAGE_CANDIDATES },
        (_, i) => `https://img/${i}.jpg`
      );
      render(
        <PhotoEditor
          photos={full}
          photoIndex={0}
          onSelect={vi.fn()}
          onAddPhoto={vi.fn()}
        />
      );
      expect(
        screen.getByText(
          new RegExp(`maximum of ${MAX_IMAGE_CANDIDATES} images`, 'i')
        )
      ).toBeInTheDocument();
      expect(
        screen.queryByLabelText('Add an image by URL')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: 'Add image' })
      ).not.toBeInTheDocument();
    });
  });
});
