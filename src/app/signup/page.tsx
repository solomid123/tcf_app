import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";
import { Divider, GoogleButton } from "@/components/auth/GoogleButton";

export const metadata = { title: "Create account — TCF Prep" };

export default function SignupPage() {
  return (
    <AuthShell
      title="Bienvenue"
      subtitle="Create your free account and start practising."
      footer={<>Already have an account? <Link href="/login" className="text-fg underline-offset-4 hover:underline">Sign in</Link></>}
    >
      <GoogleButton />
      <Divider />
      <AuthForm mode="signup" />
    </AuthShell>
  );
}
