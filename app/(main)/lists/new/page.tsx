import { authedUserId } from '@/lib/data/user.session';
import { redirect } from 'next/navigation';
import ListForm from '../ui/components/ListForm';

const NewList = async () => {
  const viewerId = await authedUserId();

  if (!viewerId) {
    redirect('/');
  }

  return (
    <main className="container">
      <ListForm />
    </main>
  );
};

export default NewList;
