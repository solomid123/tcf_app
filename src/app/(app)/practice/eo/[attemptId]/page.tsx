import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSession } from "@/lib/session";
import { Simulation } from "./Simulation";

export const metadata = { title: "Expression orale — TCF Prep" };

export default async function EOSimulationPage({ params }: PageProps<"/practice/eo/[attemptId]">) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const { supabase, user } = await getSession();
  const { data: a } = await createAdminClient()
    .from("eo_attempts")
    .select("id, user_id, status, avatar, t2:task2_id(prompt), t3:task3_id(prompt)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!a || a.user_id !== user.id) notFound();
  if (a.status !== "created") redirect(`/practice/eo/review/${a.id}`);

  const { data: s } = await supabase.auth.getSession();
  const one = <T,>(x: T | T[]) => (Array.isArray(x) ? x[0] : x);
  return (
    <Simulation
      attemptId={a.id}
      token={s.session?.access_token ?? ""}
      relayUrl={process.env.NEXT_PUBLIC_EO_RELAY_URL ?? "ws://localhost:8787/eo"}
      examiner={a.avatar === "lisa" ? "Sylvie" : "Thierry"}
      task2={one(a.t2)?.prompt ?? ""}
      task3={one(a.t3)?.prompt ?? ""}
    />
  );
}
