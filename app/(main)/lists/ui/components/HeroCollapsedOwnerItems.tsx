import { ListTable } from '@/lib/types';
import { type ListVisibility } from '@/lib/visibility';
import ShareMenuItem from './ShareMenuItem';
import VisibilityMenuItems from './VisibilityMenuItems';

// Owner variant — composes the kebab items added when the hero is
// collapsed. Only items NOT already in the base `ListActionsMenu`
// are added here. Edit list is already in the base menu, so we
// only prepend Share + Visibility radio rows here.
export default async function HeroCollapsedOwnerItems({
  list,
  visibility,
  disabled,
}: {
  list: ListTable;
  visibility: ListVisibility;
  disabled: boolean;
}) {
  return (
    <>
      <ShareMenuItem list={list} />
      <VisibilityMenuItems
        listId={list.id}
        initialVisibility={visibility}
        disabled={disabled}
      />
    </>
  );
}
