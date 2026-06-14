/* eslint-disable @next/next/no-img-element */
'use client';

import { useState } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const PAGE_SIZE = 4; // 2x2

interface ImageCandidateGridProps {
  candidates: string[];
  activeUrl?: string;
  onSelect: (url: string) => void;
  disabled?: boolean;
}

export function ImageCandidateGrid({
  candidates,
  activeUrl,
  onSelect,
  disabled,
}: ImageCandidateGridProps) {
  // Open on the page holding the current selection (usually the first).
  const [page, setPage] = useState(() => {
    const index = candidates.indexOf(activeUrl ?? '');
    return index >= 0 ? Math.floor(index / PAGE_SIZE) : 0;
  });

  const pageCount = Math.ceil(candidates.length / PAGE_SIZE);
  // Pruning can shrink the list under the current page after a page turn.
  const safePage = Math.min(page, Math.max(0, pageCount - 1));
  const start = safePage * PAGE_SIZE;
  const pageItems = candidates.slice(start, start + PAGE_SIZE);
  const multiPage = pageCount > 1;

  // Pad a short final page with empty cells so the 2x2 footprint — and the
  // flanking arrows — stay put across pages instead of jumping.
  const cells: (string | null)[] = [...pageItems];
  if (multiPage) {
    while (cells.length < PAGE_SIZE) cells.push(null);
  }

  return (
    <div className="cand-grid">
      {multiPage && (
        <button
          type="button"
          className="cand-grid-nav"
          onClick={() => setPage(Math.max(0, safePage - 1))}
          disabled={disabled || safePage === 0}
          aria-label="Previous images"
        >
          <FaChevronLeft />
        </button>
      )}

      <div className="cand-grid-tiles">
        {cells.map((url, i) => {
          if (url === null) {
            return (
              <div
                key={`empty-${i}`}
                className="cand-grid-placeholder"
                data-testid="cand-placeholder"
                aria-hidden="true"
              />
            );
          }
          const isActive = url === activeUrl;
          return (
            <div
              key={url}
              className={`image-thumbnail${isActive ? ' image-thumbnail-active' : ''}`}
              onClick={() => !disabled && onSelect(url)}
              onKeyDown={(e) => e.key === 'Enter' && !disabled && onSelect(url)}
              role="button"
              tabIndex={0}
              aria-current={isActive || undefined}
            >
              <div className="image-wrapper">
                <img src={url} alt="Product image" loading="lazy" />
              </div>
              {isActive && (
                <span className="image-thumbnail-current">Current</span>
              )}
            </div>
          );
        })}
      </div>

      {multiPage && (
        <button
          type="button"
          className="cand-grid-nav"
          onClick={() => setPage(Math.min(pageCount - 1, safePage + 1))}
          disabled={disabled || safePage >= pageCount - 1}
          aria-label="More images"
        >
          <FaChevronRight />
        </button>
      )}
    </div>
  );
}
