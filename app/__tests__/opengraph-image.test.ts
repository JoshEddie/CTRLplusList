import { describe, it } from 'vitest';

import { blockNetwork, expectSmallPng } from '@/lib/og/__tests__/test-helpers';
import Image from '../opengraph-image';

describe('BrandCardRoute', () => {
  blockNetwork();

  it('NetworkBlocked_RendersPngUnder600KB', async () => {
    await expectSmallPng(Image());
  });
});
