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

export interface LinkTabsProps {
  items: readonly TabLinkItem[];
  activeHref: string;
  size?: TabsSize;
  className?: string;
  'aria-label': string;
}

export interface TabsProps<T extends string> {
  items: readonly TabButtonItem<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: TabsSize;
  className?: string;
  'aria-label': string;
}
