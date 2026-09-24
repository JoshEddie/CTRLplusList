'use client';

import { MenuItem } from '@/app/ui/components/menu';
import { ListTable } from '@/lib/types';
import { MdOutlineIosShare } from 'react-icons/md';
import { shareList } from './utils';

export default function ShareMenuItem({ list }: { list: ListTable }) {
  return (
    <MenuItem
      icon={<MdOutlineIosShare size={18} />}
      onClick={() => shareList(list)}
    >
      Share List
    </MenuItem>
  );
}
