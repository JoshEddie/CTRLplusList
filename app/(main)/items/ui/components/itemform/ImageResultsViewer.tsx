/* eslint-disable @next/next/no-img-element */
'use client';

import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

interface ImageResultsViewerProps {
  results: Array<{
    link: string;
    title?: string;
    image?: {
      thumbnailLink?: string;
    };
  }>;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onSelect: (url: string) => void;
  customUrl: string;
  canGoPrev: boolean;
  canGoNext: boolean;
  itemsPerView: number;
  totalResults: number;
}

export function ImageResultsViewer({
  results,
  currentIndex,
  onPrev,
  onNext,
  onSelect,
  customUrl,
  canGoPrev,
  canGoNext,
  itemsPerView,
  totalResults,
}: ImageResultsViewerProps) {
  return (
    <div className="image-results">
      <div className="image-results-header">
        <span>Search Results</span>
        <div className="pagination-controls">
          <button
            onClick={onPrev}
            disabled={!canGoPrev}
            className="pagination-button"
            type="button"
            aria-label="Previous images"
          >
            <FaChevronLeft />
          </button>
          <span className="pagination-info">
            {currentIndex + 1}-{Math.min(currentIndex + itemsPerView, totalResults)} of {totalResults}
          </span>
          <button
            onClick={onNext}
            disabled={!canGoNext}
            className="pagination-button"
            type="button"
            aria-label="Next images"
          >
            <FaChevronRight />
          </button>
        </div>
      </div>

      <div className="image-grid">
        {results.map((result, index) => (
          <div
            key={index}
            className="image-thumbnail"
            onClick={() => onSelect(result.link)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(result.link)}
            role="button"
            tabIndex={0}
          >
            <div className="image-wrapper">
              <img
                src={result.image?.thumbnailLink || result.link}
                alt={result.title || 'Search result'}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="image-search-note">Click on an image to select it</div>
    </div>
  );
}
