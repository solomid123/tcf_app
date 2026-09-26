import { getSession } from "@/lib/session";
import { AvatarUploader } from "./AvatarUploader";
import { SettingsNav } from "./SettingsNav";
import { AppearancePicker } from "./AppearancePicker";
import { DeleteAccountForm, GoalsForm, PasswordForm, ProfileForm } from "./Forms";

export const metadata = { title: "Settings — TCF Prep" };

function Section({ id, title, desc, danger, children }: { id: string; title: string; desc: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <section id={id} className={`glass grain scroll-mt-[8.25rem] rounded-3xl p-7 md:p-9 ${danger ? "!border-red-400/25" : ""}`}>
      <div className="mb-7">
        <h2 className={`text-xl ${danger ? "text-danger" : ""}`}>{title}</h2>
        <p className="mt-1 text-sm text-muted">{desc}</p>
      </div>
      {children}
    </section>
  );
}

const toc = [
  { id: "profile", label: "Profile" },
  { id: "goals", label: "Exam goals" },
  { id: "appearance", label: "Appearance" },
  { id: "security", label: "Security" },
  { id: "danger", label: "Danger zone" },
];

export default async function SettingsPage() {
  const { user, profile } = await getSession();

  const providers: string[] = user.app_metadata?.providers ?? [];
  const displayName = profile?.full_name ?? user.email ?? null;

  return (
    <>
        <h1 className="sr-only">Settings</h1>

        <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
          <aside className="hidden lg:block">
            <SettingsNav items={toc} />
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

            <Section id="appearance" title="Appearance" desc="Choose how TCF Prep looks on this device.">
              <AppearancePicker />
            </Section>

            <Section id="security" title="Security" desc="Password and connected sign-in methods.">
              <div className="mb-7 flex flex-wrap gap-2">
                {["email", "google"].map((p) => {
                  const on = providers.includes(p);
                  return (
                    <span key={p} className={`rounded-full border px-3 py-1 text-xs ${on ? "border-emerald-400/30 bg-emerald-400/10 text-success" : "border-line text-muted"}`}>
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
    </>
  );
}
