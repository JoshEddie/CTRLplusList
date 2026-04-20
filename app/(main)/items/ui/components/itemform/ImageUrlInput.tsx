// ImageUrlInput.tsx
'use client';

import { FormGroup, FormLabel } from '@/app/ui/components/Form/Form';
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
    <FormGroup>
      <FormLabel>Image URL</FormLabel>
      <input
        type="url"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`form-input ${error ? 'form-input-error' : ''}`}
        placeholder="https://example.com/image.jpg"
        autoComplete="off"
      />
      {error && <div className="input-error">{error}</div>}

      <button
        type="button"
        className="search-toggle"
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
    </FormGroup>
  );
}
