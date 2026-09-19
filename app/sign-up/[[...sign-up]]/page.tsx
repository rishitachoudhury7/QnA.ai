import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return <div className="grid min-h-screen place-items-center p-6"><SignUp fallbackRedirectUrl="/dashboard" /></div>;
}
