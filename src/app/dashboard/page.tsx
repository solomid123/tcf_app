import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Backdrop } from "@/components/Backdrop";
import { skills } from "@/components/landing/data";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Dashboard — TCF Prep" };

function daysUntil(date: string) {
  const ms = new Date(`${date}T00:00:00`).getTime() - new Date().setHours(0, 0, 0, 0);
  return Math.round(ms / 86_400_000);
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, target_nclc, exam_date")
    .eq("id", auth.user.id)
    .maybeSingle();

  const name = profile?.full_name?.split(" ")[0] || auth.user.email?.split("@")[0];
  const days = profile?.exam_date ? daysUntil(profile.exam_date) : null;
  const hasGoals = Boolean(profile?.target_nclc || profile?.exam_date);

  return (
    <>
      <Backdrop />
      <AppHeader active="/dashboard" avatarUrl={profile?.avatar_url} name={profile?.full_name ?? auth.user.email} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14">
        <p className="eyebrow">Tableau de bord</p>
        <h1 className="mt-3 text-4xl md:text-5xl">
          Bonjour, <span className="text-chrome">{name}</span>
        </h1>

        {hasGoals ? (
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            {profile?.target_nclc && (
              <span className="glass rounded-full px-4 py-1.5">Target · NCLC {profile.target_nclc}</span>
            )}
            {days !== null && (
              <span className="glass rounded-full px-4 py-1.5">
                {days > 0 ? `Exam in ${days} day${days === 1 ? "" : "s"}` : days === 0 ? "Exam today — bonne chance !" : "Exam date passed"}
              </span>
            )}
          </div>
        ) : (
          <p className="mt-3 text-muted">
            Pick a skill to start practising, or{" "}
            <Link href="/settings#goals" className="text-fg underline-offset-4 hover:underline">set your exam goals</Link>.
          </p>
        )}

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {skills.map((s) => (
            <div key={s.code} className="glass grain rounded-3xl p-6">
              <span className="text-chrome text-4xl font-bold">{s.code}</span>
              <h3 className="mt-4">{s.name}</h3>
              <p className="text-sm text-muted">{s.q} · {s.t}</p>
              <span className="mt-5 inline-block rounded-full border border-white/10 px-3 py-1 text-xs text-muted">Coming soon</span>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
