import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Suspense } from 'react';
import EditListBody from './EditListBody';

type Props = {
  params: Promise<{ id: string }>;
};

export default function EditListPage({ params }: Props) {
  return (
    <main className="container">
      <Suspense fallback={<LoadingIndicator size="form" />}>
        <EditListBody params={params} />
      </Suspense>
    </main>
  );
}
