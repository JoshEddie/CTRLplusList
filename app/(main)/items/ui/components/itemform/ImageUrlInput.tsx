'use client';

import { TextField } from '@/app/ui/components/field';
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
      <TextField
        type="url"
        label="Image URL"
        error={error || undefined}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="https://example.com/image.jpg"
        autoComplete="off"
      />

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
