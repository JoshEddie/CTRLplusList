import { ItemDetails, ItemStoreTable, ItemTable } from '@/lib/types';
import Link from 'next/link';
import { MdModeEdit } from 'react-icons/md';
import '../styles/item.css';
import ItemPhoto from './ItemPhoto';
import StoreLinks from './StoreLinks';

export default function Item({
  item,
  className,
  showEditButton = false,
}: {
  item: ItemTable & { stores: ItemStoreTable[] } | ItemDetails;
  className?: string;
  showEditButton?: boolean;
}) {
  return (
    <div className={'item ' + className} title={item.name}>
      <ItemPhoto name={item.name} url={item.image_url} />
      <div className="item-info">
        <h1 className="itemName">{item.name}</h1>
        <StoreLinks stores={item.stores} />
      </div>

      {showEditButton && (
        <Link href={`/items/${item.id}`} className="edit-button">
          <MdModeEdit />
        </Link>
      )}
    </div>
  );
}
