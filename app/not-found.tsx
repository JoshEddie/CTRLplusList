import AppFrame from '@/app/ui/components/AppFrame';
import { LinkButton } from '@/app/ui/components/button';
import { ProfileSwitchProvider } from '@/app/ui/components/ProfileSwitchProvider';
import '@/app/ui/styles/app-frame.css';

export default function NotFound() {
  return (
    <ProfileSwitchProvider>
      <AppFrame>
        <div className="empty-container">
          <h3>Page Not Found</h3>
          <p>
            That link doesn&apos;t lead anywhere — it may have been moved or
            deleted.
          </p>
          <LinkButton href="/" variant="primary">
            Go Home
          </LinkButton>
        </div>
      </AppFrame>
    </ProfileSwitchProvider>
  );
}
