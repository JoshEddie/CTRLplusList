import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import Page, { metadata } from '../page';

vi.mock('../ConnectionsPage', () => ({
  default: () => <div data-testid="connections-page" />,
}));

describe('Page', () => {
  it('Render_RendersConnectionsPage', () => {
    render(<Page />);
    expect(screen.getByTestId('connections-page')).toBeInTheDocument();
  });

  it('Metadata_TitleIsConnections', () => {
    expect(metadata.title).toBe('Connections');
  });
});
