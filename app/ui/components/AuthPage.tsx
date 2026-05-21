import SignInPage from '@/app/(auth)/ui/components/SignInPage';
import AppMenu from '@/app/ui/components/AppMenu';
import { auth } from '@/lib/auth';

export default async function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    return <SignInPage />;
  }

  return (
    <>
      <AppMenu />
      <main className="container">{children}</main>
    </>
  );
}
