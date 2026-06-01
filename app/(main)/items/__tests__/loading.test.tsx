import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { describe, expect, it } from 'vitest';

import Loading from '../loading';

describe('Loading', () => {
  describe('Render', () => {
    it('Default_RendersPageLoadingIndicator', () => {
      const tree = Loading() as {
        type: unknown;
        props: { size: string };
      };
      expect(tree.type).toBe(LoadingIndicator);
      expect(tree.props.size).toBe('page');
    });
  });
});
