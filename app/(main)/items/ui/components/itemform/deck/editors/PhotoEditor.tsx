/* eslint-disable @next/next/no-img-element */
'use client';

import { Button } from '@/app/ui/components/button';
import { TextField } from '@/app/ui/components/field';
import { MAX_IMAGE_CANDIDATES } from '@/lib/imageCandidates';
import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { isValidProductUrl } from '../../utils';

// The photo pool is already pruned of undersized images upstream (prunePhotos
// runs once at fetch time), so this just presents what it's given.
interface PhotoEditorProps {
  photos: string[];
  photoIndex: number;
  onSelect: (index: number) => void;
  onAddPhoto: (url: string) => void;
  disabled?: boolean;
}

export function PhotoEditor({
  photos,
  photoIndex,
  onSelect,
  onAddPhoto,
  disabled,
}: PhotoEditorProps) {
  const [draftUrl, setDraftUrl] = useState('');
  const [addError, setAddError] = useState('');

  const hasPhotos = photos.length > 0;
  const activeUrl = photos[photoIndex];
  const canCycle = photos.length > 1;
  const atCap = photos.length >= MAX_IMAGE_CANDIDATES;

  const cycle = (delta: number) => {
    const pos = photoIndex >= 0 && photoIndex < photos.length ? photoIndex : 0;
    onSelect((pos + delta + photos.length) % photos.length);
  };

  const addPhoto = () => {
    const url = draftUrl.trim();
    if (!isValidProductUrl(url)) {
      setAddError('Enter a valid image URL (https://…).');
      return;
    }
    onAddPhoto(url);
    setDraftUrl('');
    setAddError('');
  };

  return (
    <div className="deck-photo">
      {hasPhotos ? (
        <>
          <div className="deck-photo-stage">
            {canCycle && (
              <button
                type="button"
                className="deck-photo-nav"
                onClick={() => cycle(-1)}
                disabled={disabled}
                aria-label="Previous image"
              >
                <FaChevronLeft aria-hidden="true" />
              </button>
            )}
            <div className="deck-photo-frame">
              {activeUrl && (
                <img src={activeUrl} alt="Selected product image" />
              )}
            </div>
            {canCycle && (
              <button
                type="button"
                className="deck-photo-nav"
                onClick={() => cycle(1)}
                disabled={disabled}
                aria-label="Next image"
              >
                <FaChevronRight aria-hidden="true" />
              </button>
            )}
          </div>

          {canCycle && (
            <div className="deck-photo-strip">
              {photos.map((url, index) => {
                const isActive = index === photoIndex;
                return (
                  <button
                    key={url}
                    type="button"
                    className={`deck-photo-thumb${isActive ? ' deck-photo-thumb-active' : ''}`}
                    onClick={() => onSelect(index)}
                    disabled={disabled}
                    aria-pressed={isActive}
                    aria-label={`Use image ${index + 1}`}
                  >
                    <img src={url} alt="" loading="lazy" />
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <p className="deck-photo-empty">
          We couldn&apos;t find any images for this product. Add one by URL
          below, or continue without a photo.
        </p>
      )}

      <div className="deck-photo-add">
        {atCap ? (
          <p className="deck-photo-empty">
            You&apos;ve added the maximum of {MAX_IMAGE_CANDIDATES} images.
          </p>
        ) : (
          <>
            <TextField
              type="url"
              label="Add an image by URL"
              value={draftUrl}
              error={addError || undefined}
              onChange={(e) => {
                setDraftUrl(e.target.value);
                setAddError('');
              }}
              disabled={disabled}
              placeholder="https://example.com/image.jpg"
              autoComplete="off"
            />
            <Button
              variant="secondary"
              onClick={addPhoto}
              disabled={disabled || !draftUrl.trim()}
            >
              Add image
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
