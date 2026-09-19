import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <div className="grid min-h-screen place-items-center p-6"><SignIn fallbackRedirectUrl="/dashboard" /></div>;
}
