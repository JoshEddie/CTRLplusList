'use client';

import { Button } from '@/app/ui/components/button';
import type { ButtonSize } from '@/app/ui/components/button/types';
import { getMessage } from '@/lib/i18n/utils';
import { FaPlus } from 'react-icons/fa';

export default function NewItemButton({
  size,
  onClick,
}: {
  size?: ButtonSize;
  onClick: () => void;
}) {
  return (
    <Button variant="primary" size={size} onClick={onClick}>
      <FaPlus size={12} />
      {getMessage('edit_mode_new_item_label')}
    </Button>
  );
}
