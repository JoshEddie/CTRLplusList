'use client';

import { useRef, useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import { ImageResultsViewer } from './ImageResultsViewer';

interface GoogleImageSearchProps {
  onSelectImage: (url: string) => void;
  customUrl?: string;
  searchResults: GoogleImageResult[];
  setSearchResults: (results: GoogleImageResult[]) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  disabled?: boolean;
}

interface GoogleImageResult {
  link: string;
  title: string;
  image: {
    byteSize: number;
    contextLink: string;
    height: number;
    thumbnailLink: string;
    width: number;
  };
}

export function GoogleImageSearch({
  onSelectImage,
  customUrl,
  searchResults,
  setSearchResults,
  searchTerm,
  setSearchTerm,
  disabled = false,
}: GoogleImageSearchProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  const ITEMS_PER_PAGE = 3;
  const MAX_RESULTS = 10;
  const ITEMS_PER_VIEW = 3;

  const searchImages = async (query: string) => {
    if (!query.trim()) return;

    setIsSearching(true);
    setError('');

    try {
      const response = await fetch(
        `/api/google-images?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      const data = await response.json();

      if (data.items && data.items.length > 0) {
        setSearchResults(data.items.slice(0, MAX_RESULTS));
        setCurrentIndex(0);
      } else {
        setSearchResults([]);
        setError('No images found. Try a different search term.');
      }
    } catch (err) {
      console.error('Error searching for images:', err);
      setError('Failed to load images. Please try again later.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (searchTerm.trim()) {
      await searchImages(searchTerm);
    }

    // Prevent form submission from bubbling up
    return false;
  };

  const handleImageSelect = (url: string) => {
    onSelectImage(url);
  };

  const nextImages = () => {
    if (currentIndex + ITEMS_PER_PAGE < searchResults.length) {
      let nextIndex = currentIndex + 3;
      while (nextIndex + ITEMS_PER_PAGE > searchResults.length) {
        nextIndex -= 1;
      }
      setCurrentIndex(nextIndex);
    }
  };

  const prevImages = () => {
    if (currentIndex > 0) {
      let prevIndex = currentIndex - 3;
      while (prevIndex < 0) {
        prevIndex += 1;
      }
      setCurrentIndex(prevIndex);
    }
  };

  const visibleRange = searchResults.slice(
    currentIndex,
    currentIndex + ITEMS_PER_VIEW
  );
  const canGoNext = currentIndex + ITEMS_PER_VIEW < searchResults.length;
  const canGoPrev = currentIndex > 0;

  return (
    <>
      <div className="search-input-container">
        <input
          ref={searchInputRef}
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          disabled={disabled || isSearching}
          placeholder="Search for an image..."
          className="form-input"
          autoComplete="off"
          onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
        />
        <button
          type="button"
          className="search-button"
          onClick={(e) => {
            e.preventDefault();
            handleSearch(e);
          }}
          disabled={disabled || isSearching || !searchTerm.trim()}
        >
          {isSearching ? 'Searching...' : <FaSearch />}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {searchResults.length > 0 && (
        <ImageResultsViewer
          results={visibleRange}
          currentIndex={currentIndex}
          onPrev={prevImages}
          onNext={nextImages}
          onSelect={handleImageSelect}
          customUrl={customUrl}
          canGoPrev={canGoPrev}
          canGoNext={canGoNext}
          itemsPerView={ITEMS_PER_VIEW}
          totalResults={searchResults.length}
        />
      )}
    </>
  );
}
