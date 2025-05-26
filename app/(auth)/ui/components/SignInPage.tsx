import { SignInButton } from "@/app/(auth)/ui/components/AuthButtons";
import AuthContainer from "@/app/(auth)/ui/components/AuthContainer";
import Image from "next/image";
import { Suspense } from "react";

import '../styles/auth.css';

export default function SignInPage() {
  return (
    <AuthContainer>
      <Image src="/wishlist.webp" alt="Wishlist Logo" width={250} height={56} priority={true} />
      <Suspense fallback={"loading sign in..."}>
        <SignInButton />
      </Suspense>
    </AuthContainer>
  )
}