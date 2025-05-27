import SignInPage from "@/app/(auth)/ui/components/SignInPage";
import { Suspense } from "react";

export default async function IndexPage() {

  return (
    <Suspense fallback={"loading sign in..."}>
      <SignInPage />
    </Suspense>
  )
}