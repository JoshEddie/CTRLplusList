import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ImageResultsViewer } from '../ImageResultsViewer';

const RESULTS = [
  {
    link: 'https://cdn.example/full-a.jpg',
    title: 'Red Mug',
    image: { thumbnailLink: 'https://cdn.example/thumb-a.jpg' },
  },
  { link: 'https://cdn.example/full-b.jpg' },
];

describe('ImageResultsViewer', () => {
  it('Results_RenderCount-ThumbnailSrc-FallbackAltAndSrc', () => {
    render(<ImageResultsViewer results={RESULTS} onSelect={vi.fn()} />);
    expect(screen.getByText('2 images')).toBeInTheDocument();
    expect(screen.getByAltText('Red Mug')).toHaveAttribute(
      'src',
      'https://cdn.example/thumb-a.jpg'
    );
    // Second result: no thumbnailLink → src falls back to link; no title → alt fallback.
    const fallback = screen.getByAltText('Search result');
    expect(fallback).toHaveAttribute('src', 'https://cdn.example/full-b.jpg');
  });

  it('ClickThumbnail_CallsOnSelectWithLink', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ImageResultsViewer results={RESULTS} onSelect={onSelect} />);
    await user.click(screen.getByTitle('Red Mug'));
    expect(onSelect).toHaveBeenCalledWith('https://cdn.example/full-a.jpg');
  });

  it('EnterKeyOnThumbnail_CallsOnSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ImageResultsViewer results={RESULTS} onSelect={onSelect} />);
    screen.getByTitle('Red Mug').focus();
    await user.keyboard('{Enter}');
    expect(onSelect).toHaveBeenCalledWith('https://cdn.example/full-a.jpg');
  });

  it('NonEnterKeyOnThumbnail_DoesNotSelect', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<ImageResultsViewer results={RESULTS} onSelect={onSelect} />);
    screen.getByTitle('Red Mug').focus();
    await user.keyboard('a');
    expect(onSelect).not.toHaveBeenCalled();
  });
});
