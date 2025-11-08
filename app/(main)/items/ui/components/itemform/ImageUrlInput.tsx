// ImageUrlInput.tsx
'use client';

import { FormGroup, FormLabel } from '@/app/ui/components/Form/Form';
import { GoogleImageResult } from '@/lib/types';
import { useState } from 'react';
import { GoogleImageSearch } from './GoogleImageSearch';
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
  const [customUrl, setCustomUrl] = useState(value || '');
  const [searchResults, setSearchResults] = useState<GoogleImageResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const handleImageSelect = (url: string) => {
    setCustomUrl(url);
    onChange(url);
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
      <GoogleImageSearch
        customUrl={customUrl}
        searchResults={searchResults}
        setSearchResults={setSearchResults}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        onSelectImage={handleImageSelect}
        disabled={disabled}
      />
      {error && <div className="input-error">{error}</div>}
    </FormGroup>
  );
}
