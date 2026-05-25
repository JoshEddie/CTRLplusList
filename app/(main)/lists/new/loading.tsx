import Header from '@/app/ui/components/Header';
import LoadingIndicator from '@/app/ui/components/LoadingIndicator';

export default function Loading() {
  return (
    <div className="list-container">
      <Header title="Loading..." />
      <LoadingIndicator size="page" />
    </div>
  );
}
