import { SignInButton } from "@/app/(auth)/ui/components/AuthButtons";
import Image from "next/image";
import { Suspense } from "react";

import '../styles/auth.css';

export default function SignInPage() {
  return (
    <div className="sign-in-page">
      <div className="auth-container">
        <Image src="/wishlist.webp" alt="Wishlist Logo" width={250} height={56} priority={true} />
        <Suspense fallback={"loading sign in..."}>
          <SignInButton />
        </Suspense>
      </div>
    </div>
  )
}