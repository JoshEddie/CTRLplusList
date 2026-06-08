import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Loading from '../loading';

describe('ListLoading', () => {
  it('Default_RendersPageLoadingIndicator', () => {
    render(<Loading />);
    const status = screen.getByRole('status');
    expect(status).toHaveClass('loading-indicator', 'loading-indicator--page');
  });
});
