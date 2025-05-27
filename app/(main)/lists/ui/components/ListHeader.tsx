import { ListTable, UserTable } from '@/lib/types';
import { FaCalendar, FaGift, FaUser } from 'react-icons/fa';
interface ListHeaderProps {
  title: string;
  user: UserTable | null;
  list: ListTable;
  children?: React.ReactNode;
}

export default function ListHeader({
  title,
  user,
  list,
  children,
}: ListHeaderProps) {
  return (
    <>
      <div className="list-title">{title}</div>
      {user && (
        <div className="list-info">
          <div className="list-info-item">
            <FaUser /> {user.name}
          </div>
          <div className="list-info-item">
            <FaCalendar />{' '}
            {list.date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: '2-digit',
              timeZone: 'UTC',
            })}
          </div>
          <div className="list-info-item">
            <FaGift /> {list.occasion}
          </div>
        </div>
      )}
      <div className="list-details-buttons">{children}</div>
    </>
  );
}
