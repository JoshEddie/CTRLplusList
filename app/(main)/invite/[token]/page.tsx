import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Metadata } from 'next';
import { Suspense } from 'react';
import InvitePage from './InvitePage';

type Props = { params: Promise<{ token: string }> };

export const metadata: Metadata = { title: 'Invite' };

export default function Page(props: Props) {
  return (
    <Suspense fallback={<LoadingIndicator size="page" />}>
      <InvitePage {...props} />
    </Suspense>
  );
}
