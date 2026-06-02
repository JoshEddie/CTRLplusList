'use client';

import { FieldError, SearchField } from '@/app/ui/components/field';
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { FaSearch, FaTimes } from 'react-icons/fa';
import { ImageResultsViewer } from './ImageResultsViewer';

// "Am I on the client?" without tripping react-hooks/set-state-in-effect. An
// empty subscribe + true/false snapshot is the canonical useSyncExternalStore
// pattern for SSR-safe client detection (same approach as use-media-query.ts).
const subscribeNoop = () => () => {};
const getClientSnapshot = () => true;
/* v8 ignore next -- getServerSnapshot is only invoked by React during server-side rendering; the jsdom client test env always resolves getClientSnapshot. */
const getServerSnapshot = () => false;

interface ImageSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectImage: (url: string) => void;
  searchResults: ImageSearchResult[];
  setSearchResults: (results: ImageSearchResult[]) => void;
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  disabled?: boolean;
}

interface ImageSearchResult {
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

export function ImageSearch({
  isOpen,
  onClose,
  onSelectImage,
  searchResults,
  setSearchResults,
  searchTerm,
  setSearchTerm,
  disabled = false,
}: ImageSearchProps) {
  // Mounted guard so createPortal doesn't run during SSR.
  const mounted = useSyncExternalStore(
    subscribeNoop,
    getClientSnapshot,
    getServerSnapshot
  );

  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const runSearch = useCallback(async () => {
    const query = searchTerm.trim();
    if (!query) return;

    setIsSearching(true);
    setError('');

    try {
      const response = await fetch(
        `/api/image-search?q=${encodeURIComponent(query)}`
      );
      const data = await response.json().catch(() => ({}));

      if (response.status === 429 || data?.error === 'quota_exceeded') {
        setSearchResults([]);
        setError(
          'Image search is temporarily unavailable. Please paste an image URL instead.'
        );
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch images');
      }

      if (data.items && data.items.length > 0) {
        setSearchResults(data.items);
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
  }, [searchTerm, setSearchResults]);

  // Focus the search input and lock body scroll when the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Focus after paint so the field is actually mounted.
    const id = window.setTimeout(() => searchInputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  // Close on Escape.
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !mounted) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) onClose();
  };

  // Intercept Enter so it does NOT bubble up to the outer ItemForm's <form>
  // via React's synthetic event tree (portal or not).
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      void runSearch();
    }
  };

  const handleSearchClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    void runSearch();
  };

  const content = (
    <div
      ref={backdropRef}
      className="image-modal-backdrop"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-search-modal-title"
    >
      <div className="image-modal">
        <div className="image-modal-header">
          <h2 id="image-search-modal-title" className="image-modal-title">
            Search for an image
          </h2>
          <button
            type="button"
            className="image-modal-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Close image search"
          >
            <FaTimes />
          </button>
        </div>

        <div className="image-modal-body">
          <div className="search-input-container">
            <SearchField
              ref={searchInputRef}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleInputKeyDown}
              disabled={disabled || isSearching}
              placeholder="Search for an image..."
              aria-label="Search for an image"
              autoComplete="off"
            />
            <button
              type="button"
              className="search-button"
              onClick={handleSearchClick}
              disabled={disabled || isSearching || !searchTerm.trim()}
            >
              {isSearching ? 'Searching...' : <FaSearch />}
            </button>
          </div>

          {error && <FieldError>{error}</FieldError>}

          {searchResults.length > 0 && (
            <ImageResultsViewer
              results={searchResults}
              onSelect={onSelectImage}
            />
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
