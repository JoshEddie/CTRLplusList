import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import SharedPage from '../page';

describe('SharedPage', () => {
  it('Render_ShowsSharedPagePlaceholderText', () => {
    render(<SharedPage />);
    expect(screen.getByText('Shared Page')).toBeInTheDocument();
  });
});
