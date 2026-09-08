'use client';

import { Button } from '@/app/ui/components/button';
import { Menu, MenuItem } from '@/app/ui/components/menu';
import { getMessage } from '@/lib/i18n/utils';
import { useRef, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import { MdCollectionsBookmark, MdEdit } from 'react-icons/md';

// The menu meets an intent — "I want to add an item" — where the All items tab
// reports a location. Choosing from existing selects that tab rather than
// opening a surface of its own, which is how the owner learns where it lives.
export default function AddItemMenu({
  onCreate,
  onChooseExisting,
}: {
  onCreate: () => void;
  onChooseExisting: () => void;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  const run = (act: () => void) => () => {
    setOpen(false);
    act();
  };

  return (
    <div className="list-owner-add">
      <Button
        ref={triggerRef}
        variant="primary"
        size="sm"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <FaPlus size={12} />
        {getMessage('add_item_label')}
      </Button>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        anchorRef={triggerRef}
        aria-label={getMessage('add_item_label')}
      >
        <MenuItem icon={<MdEdit size={18} />} onClick={run(onCreate)}>
          {getMessage('add_item_create_new')}
        </MenuItem>
        <MenuItem
          icon={<MdCollectionsBookmark size={18} />}
          onClick={run(onChooseExisting)}
        >
          {getMessage('add_item_choose_existing')}
        </MenuItem>
      </Menu>
    </div>
  );
}
