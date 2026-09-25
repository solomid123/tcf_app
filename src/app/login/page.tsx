import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { AuthForm } from "@/components/auth/AuthForm";
import { Divider, GoogleButton } from "@/components/auth/GoogleButton";

export const metadata = { title: "Sign in — TCF Prep" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <AuthShell
      title="Bon retour"
      subtitle="Sign in to continue your preparation."
      footer={<>New here? <Link href="/signup" className="text-fg underline-offset-4 hover:underline">Create an account</Link></>}
    >
      <GoogleButton next={next} />
      <Divider />
      <AuthForm mode="login" next={next} initialError={error} />
    </AuthShell>
  );
}
