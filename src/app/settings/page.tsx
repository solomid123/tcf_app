import { redirect } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { Backdrop } from "@/components/Backdrop";
import { createClient } from "@/lib/supabase/server";
import { AvatarUploader } from "./AvatarUploader";
import { DeleteAccountForm, GoalsForm, PasswordForm, ProfileForm } from "./Forms";

export const metadata = { title: "Settings — TCF Prep" };

function Section({ id, title, desc, danger, children }: { id: string; title: string; desc: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`glass grain scroll-mt-28 rounded-3xl p-7 md:p-9 ${danger ? "!border-red-400/25" : ""}`}>
      <div className="mb-7">
        <h2 className={`text-xl ${danger ? "text-red-200" : ""}`}>{title}</h2>
        <p className="mt-1 text-sm text-muted">{desc}</p>
      </div>
      {children}
    </section>
  );
}

const toc = [
  { id: "profile", label: "Profile" },
  { id: "goals", label: "Exam goals" },
  { id: "security", label: "Security" },
  { id: "danger", label: "Danger zone" },
];

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) redirect("/login?next=/settings");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, target_nclc, exam_date")
    .eq("id", user.id)
    .maybeSingle();

  const providers: string[] = user.app_metadata?.providers ?? [];
  const displayName = profile?.full_name ?? user.email ?? null;

  return (
    <>
      <Backdrop />
      <AppHeader active="/settings" avatarUrl={profile?.avatar_url} name={displayName} />

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-14">
        <p className="eyebrow">Paramètres</p>
        <h1 className="mt-3 text-4xl md:text-5xl"><span className="text-chrome">Settings</span></h1>

        <div className="mt-10 grid gap-8 lg:grid-cols-[200px_1fr]">
          <aside className="hidden lg:block">
            <nav className="glass sticky top-8 space-y-1 rounded-3xl p-3">
              {toc.map((t) => (
                <a key={t.id} href={`#${t.id}`} className="block rounded-2xl px-4 py-2.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg">
                  {t.label}
                </a>
              ))}
            </nav>
          </aside>

          <div className="space-y-6">
            <Section id="profile" title="Profile" desc="How you appear across TCF Prep.">
              <div className="space-y-8">
                <AvatarUploader userId={user.id} url={profile?.avatar_url ?? null} name={displayName} />
                <ProfileForm fullName={profile?.full_name ?? ""} email={user.email ?? ""} />
              </div>
            </Section>

            <Section id="goals" title="Exam goals" desc="Your target score and exam date.">
              <GoalsForm targetNclc={profile?.target_nclc ?? null} examDate={profile?.exam_date ?? null} />
            </Section>

            <Section id="security" title="Security" desc="Password and connected sign-in methods.">
              <div className="mb-7 flex flex-wrap gap-2">
                {["email", "google"].map((p) => {
                  const on = providers.includes(p);
                  return (
                    <span key={p} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200" : "border-white/10 text-muted"}`}>
                      {p === "email" ? "Email & password" : "Google"} · {on ? "connected" : "not connected"}
                    </span>
                  );
                })}
              </div>
              <PasswordForm hasPassword={providers.includes("email")} />
            </Section>

            <Section id="danger" title="Danger zone" desc="Irreversible actions." danger>
              <DeleteAccountForm />
            </Section>
          </div>
        </div>
      </main>
    </>
  );
}
