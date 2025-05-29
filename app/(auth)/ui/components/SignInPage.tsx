import AuthContainer from "@/app/(auth)/ui/components/AuthContainer";
import SignInButton from "@/app/(auth)/ui/components/SignInButton";
import { auth } from "@/lib/auth";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import '../styles/auth.css';

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect('/lists');
  }

  return (
    <AuthContainer>
      <Image src="/ctrlpluslist_logo-ver-color.webp" alt="Ctrl+List" width={200} height={120} priority={true} />
      <Suspense fallback={"loading sign in..."}>
        <SignInButton />
      </Suspense>
    </AuthContainer>
  )
}