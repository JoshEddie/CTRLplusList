import { LinkButton } from '@/app/ui/components/button';
import { FaPlus } from 'react-icons/fa';

export default function EmptyList() {
  return (
    <div className="empty-list">
      <h3>No lists found</h3>
      <p>Create your first list below.</p>
      <LinkButton variant="primary" href="/lists/new">
        <FaPlus size={14} />
        Create List
      </LinkButton>
    </div>
  );
}
