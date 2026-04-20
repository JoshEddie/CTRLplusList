/* eslint-disable @next/next/no-img-element */
'use client';

interface ImageResultsViewerProps {
  results: Array<{
    link: string;
    title?: string;
    image?: {
      thumbnailLink?: string;
    };
  }>;
  onSelect: (url: string) => void;
}

export function ImageResultsViewer({
  results,
  onSelect,
}: ImageResultsViewerProps) {
  return (
    <div className="image-results">
      <div className="image-results-header">
        <span>Search Results</span>
        <span className="pagination-info">{results.length} images</span>
      </div>

      <div className="image-grid">
        {results.map((result, index) => (
          <div
            key={`${result.link}-${index}`}
            className="image-thumbnail"
            onClick={() => onSelect(result.link)}
            onKeyDown={(e) => e.key === 'Enter' && onSelect(result.link)}
            role="button"
            tabIndex={0}
            title={result.title}
          >
            <div className="image-wrapper">
              <img
                src={result.image?.thumbnailLink || result.link}
                alt={result.title || 'Search result'}
                loading="lazy"
              />
            </div>
          </div>
        ))}
      </div>

      <div className="image-search-note">Click an image to select it</div>
    </div>
  );
}
