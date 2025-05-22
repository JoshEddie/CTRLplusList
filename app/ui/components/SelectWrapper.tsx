import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { ReactNode } from 'react';

const cache = createCache({
  key: 'my-select-cache',
  prepend: true,
});

const SelectWrapper = ({ children }: { children: ReactNode }) => {
  return <CacheProvider value={cache}>{children}</CacheProvider>;
};

SelectWrapper.displayName = 'SelectWrapper';

export default SelectWrapper;
