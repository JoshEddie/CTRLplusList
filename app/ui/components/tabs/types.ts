import type { ReactNode } from 'react';

// A strip that *is* its page's title renders `default`; a strip sitting beneath
// a real heading renders `sm`.
export type TabsSize = 'default' | 'sm';

export interface TabLinkItem {
  label: ReactNode;
  href: string;
}

export interface TabButtonItem<T extends string = string> {
  label: ReactNode;
  value: T;
  panelId: string;
  id?: string;
}

type TabsBaseProps = {
  size?: TabsSize;
  className?: string;
  'aria-label': string;
};

export type TabsProps<T extends string> = TabsBaseProps &
  (
    | { items: readonly TabLinkItem[]; activeHref: string }
    | {
        items: readonly TabButtonItem<T>[];
        value: T;
        onChange: (value: T) => void;
      }
  );
