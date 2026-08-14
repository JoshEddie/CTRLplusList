/* eslint-disable @next/next/no-img-element */
'use client';

import { Button } from '@/app/ui/components/button';
import { TextField } from '@/app/ui/components/field';
import { MAX_IMAGE_CANDIDATES } from '@/lib/imageCandidates';
import { isPlaceholderUri } from '@/lib/placeholderArt.shared';
import { useState } from 'react';
import { FaChevronLeft, FaChevronRight, FaDice } from 'react-icons/fa';
import { isValidProductUrl } from '@/lib/storeValidity';

// The photo pool is already pruned of undersized images upstream (prunePhotos
// runs once at fetch time), so this just presents what it's given. Placeholder
// previews arrive separately and never pass through pruning or the cap.
interface PhotoEditorProps {
  photos: string[];
  photoIndex: number;
  /** Transient placeholder-art previews appended after the real thumbs. */
  placeholders: string[];
  /** The selected placeholder URI, or null when a real photo is selected. */
  selectedPlaceholder: string | null;
  onSelect: (index: number) => void;
  onSelectPlaceholder: (uri: string) => void;
  onReroll: () => void;
  onAddPhoto: (url: string) => void;
  disabled?: boolean;
}

export function PhotoEditor({
  photos,
  photoIndex,
  placeholders,
  selectedPlaceholder,
  onSelect,
  onSelectPlaceholder,
  onReroll,
  onAddPhoto,
  disabled,
}: PhotoEditorProps) {
  const [draftUrl, setDraftUrl] = useState('');
  const [addError, setAddError] = useState('');

  const activeUrl = selectedPlaceholder ?? photos[photoIndex];
  const thumbCount = photos.length + placeholders.length;
  const canCycle = thumbCount > 1;
  // A saved placeholder riding the pool is exempt from the cap, mirroring
  // server validation.
  const atCap =
    photos.filter((url) => !isPlaceholderUri(url)).length >=
    MAX_IMAGE_CANDIDATES;

  const selectAt = (position: number) => {
    if (position < photos.length) onSelect(position);
    else onSelectPlaceholder(placeholders[position - photos.length]);
  };

  const cycle = (delta: number) => {
    const current = selectedPlaceholder
      ? photos.length + placeholders.indexOf(selectedPlaceholder)
      : photoIndex >= 0 && photoIndex < photos.length
        ? photoIndex
        : 0;
    selectAt((current + delta + thumbCount) % thumbCount);
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
          {activeUrl && <img src={activeUrl} alt="Selected product image" />}
          {selectedPlaceholder && (
            <Button
              variant="secondary"
              className="deck-photo-reroll"
              onClick={onReroll}
              disabled={disabled}
              aria-label="Reroll artwork"
            >
              <FaDice aria-hidden="true" /> Reroll
            </Button>
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
            const isActive = !selectedPlaceholder && index === photoIndex;
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
          {placeholders.map((url, index) => {
            const isActive = url === selectedPlaceholder;
            return (
              <button
                key={url}
                type="button"
                className={`deck-photo-thumb${isActive ? ' deck-photo-thumb-active' : ''}`}
                onClick={() => onSelectPlaceholder(url)}
                disabled={disabled}
                aria-pressed={isActive}
                aria-label={`Use artwork ${index + 1}`}
              >
                <img src={url} alt="" loading="lazy" />
              </button>
            );
          })}
        </div>
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
