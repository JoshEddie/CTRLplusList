'use client';

import { useEffect, useState } from 'react';
import { HERO_SLOT_READY_EVENT } from './ListHeroSurface';

// The hero chrome creates its slots imperatively after hydration, and its
// section hydrates independently of whatever portals into it, so a lookup on
// mount can miss. Re-check when the chrome announces itself.
export function useHeroSlot(id: string) {
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const find = () => setSlot(document.getElementById(id));
    find();
    window.addEventListener(HERO_SLOT_READY_EVENT, find);
    return () => window.removeEventListener(HERO_SLOT_READY_EVENT, find);
  }, [id]);
  return slot;
}
