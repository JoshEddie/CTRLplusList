// ImageUrlInput.tsx
'use client';

import { ImageSearchResult } from '@/lib/types';
import { useState } from 'react';
import { ImageSearch } from './ImageSearch';
import './image-search.css';

interface ImageUrlInputProps {
  value?: string | null;
  error: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function ImageUrlInput({
  value,
  error,
  onChange,
  disabled,
}: ImageUrlInputProps) {
  const [searchResults, setSearchResults] = useState<ImageSearchResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleImageSelect = (url: string) => {
    onChange(url);
    setIsSearchOpen(false);
  };

  return (
    <div>
      <div className="if-img-row">
        <input
          type="url"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className={`form-input ${error ? 'form-input-error' : ''}`}
          placeholder="https://example.com/image.jpg"
          autoComplete="off"
        />
        {value && (
          <div className="if-img-thumb" aria-hidden="true">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value}
              alt=""
              onError={(e) => {
                (e.currentTarget.parentElement as HTMLElement).style.display =
                  'none';
              }}
            />
          </div>
        )}
      </div>
      {error && <div className="input-error">{error}</div>}

      <button
        type="button"
        className="if-search-link"
        onClick={() => setIsSearchOpen(true)}
        disabled={disabled}
      >
        Can&apos;t find a URL? Search for an image
      </button>

      <ImageSearch
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        searchResults={searchResults}
        setSearchResults={setSearchResults}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSelectImage={handleImageSelect}
        disabled={disabled}
      />
    </div>
  );
}
