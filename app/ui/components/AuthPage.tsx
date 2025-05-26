import SignInPage from "@/app/(auth)/ui/components/SignInPage";
import Menu from "@/app/ui/components/Menu";
import { auth } from "@/lib/auth";

export default async function AuthProvider({ children }: { children: React.ReactNode }) {
    const session = await auth();
    
    if (!session?.user) {
      return <SignInPage />;
    }
  
    return (
      <>
        <Menu />
        <main className="container">
          {children}
        </main>
      </>
    );
  }