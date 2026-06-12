import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import NotFound from '../page';

describe('NotFound', () => {
  it('Render_Shows404PageNotFoundMessage', () => {
    render(<NotFound />);
    expect(screen.getByText('404 - Page Not Found')).toBeInTheDocument();
  });
});
