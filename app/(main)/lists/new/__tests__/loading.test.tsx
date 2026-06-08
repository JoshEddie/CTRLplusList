import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Loading from '../loading';

describe('NewListLoading', () => {
  it('Default_RendersLoadingHeader-PageLoadingIndicator', () => {
    render(<Loading />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    const status = screen.getByRole('status');
    expect(status).toHaveClass('loading-indicator', 'loading-indicator--page');
  });
});
