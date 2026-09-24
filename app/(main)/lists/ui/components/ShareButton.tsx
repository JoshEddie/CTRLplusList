'use client';

import { Button } from '@/app/ui/components/button';
import { ListTable } from '@/lib/types';
import { MdOutlineIosShare } from 'react-icons/md';
import { shareList } from './utils';

export default function ShareButton({ list }: { list: ListTable }) {
  return (
    <Button size='xs' variant="on-dark" onClick={() => shareList(list)} aria-label="Share list">
      <MdOutlineIosShare />
      <span className="label">Share</span>
    </Button>
  );
}
