import { redirect } from "next/navigation";
import { Backdrop } from "@/components/Backdrop";
import { Logo } from "@/components/Logo";
import { signOut } from "@/app/auth/actions";
import { createClient } from "@/lib/supabase/server";
import { skills } from "@/components/landing/data";

export const metadata = { title: "Dashboard — TCF Prep" };

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, target_nclc")
    .eq("id", auth.user.id)
    .maybeSingle();

  const name = profile?.full_name?.split(" ")[0] || auth.user.email?.split("@")[0];

  return (
    <>
      <Backdrop />
      <header className="mx-auto mt-4 w-full max-w-6xl px-4">
        <nav className="glass grain flex items-center justify-between rounded-full py-2.5 pl-5 pr-2.5">
          <Logo />
          <div className="flex items-center gap-3">
            {profile?.avatar_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full border border-white/20" referrerPolicy="no-referrer" />
            )}
            <form action={signOut}>
              <button className="btn btn-glass !py-2 text-sm">Sign out</button>
            </form>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14">
        <p className="eyebrow">Tableau de bord</p>
        <h1 className="mt-3 text-4xl md:text-5xl">
          Bonjour, <span className="text-chrome">{name}</span>
        </h1>
        <p className="mt-3 text-muted">
          {profile?.target_nclc ? `Target: NCLC ${profile.target_nclc}` : "Pick a skill to start practising."}
        </p>

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
