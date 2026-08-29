import LoadingIndicator from '@/app/ui/components/LoadingIndicator';
import { Metadata } from 'next';
import { Suspense } from 'react';
import AltvatarSpacePage from './AltvatarSpacePage';

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export const metadata: Metadata = { title: 'Altvatar' };

// `params` is handed down unawaited: awaiting it in the shell holds the whole
// navigation on runtime data, where awaiting it inside the boundary streams
// the fallback immediately.
export default function Page(props: Props) {
  return (
    <Suspense fallback={<LoadingIndicator size="page" />}>
      <AltvatarSpacePage {...props} />
    </Suspense>
  );
}
