"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Live simulations are costly (real-time speech + avatar), so each user gets a few per day. */
const DAILY_SIMULATIONS = 3;

// The examiner: Québec HD voices, each paired with a matching avatar.
const EXAMINERS = [
  { voice: "fr-CA-Thierry:DragonHDLatestNeural", avatar: "harry" },
  { voice: "fr-CA-Sylvie:DragonHDLatestNeural", avatar: "lisa" },
];

export async function startSimulation() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const userId = data.user.id;
  const admin = createAdminClient();

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await admin
    .from("eo_attempts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .neq("status", "created")
    .gte("created_at", since);
  if ((count ?? 0) >= DAILY_SIMULATIONS) redirect("/practice/eo?limit=1");

  // Reuse an unstarted simulation rather than piling them up.
  const { data: open } = await admin.from("eo_attempts").select("id").eq("user_id", userId).eq("status", "created").maybeSingle();
  if (open) redirect(`/practice/eo/${open.id}`);

  // Sujets this user hasn't had yet (fall back to all once they've seen everything).
  const { data: past } = await admin.from("eo_attempts").select("task2_id, task3_id").eq("user_id", userId);
  const used = new Set((past ?? []).flatMap((p) => [p.task2_id, p.task3_id]));
  const { data: sujets } = await admin.from("eo_sujets").select("id, task");
  const pick = (task: number) => {
    const all = (sujets ?? []).filter((s) => s.task === task);
    const fresh = all.filter((s) => !used.has(s.id));
    const pool = fresh.length ? fresh : all;
    return pool[Math.floor(Math.random() * pool.length)]?.id;
  };
  const task2 = pick(2);
  const task3 = pick(3);
  if (!task2 || !task3) throw new Error("No Expression orale sujets available");

  const examiner = EXAMINERS[Math.floor(Math.random() * EXAMINERS.length)];
  const { data: row, error } = await admin
    .from("eo_attempts")
    .insert({ user_id: userId, task2_id: task2, task3_id: task3, voice: examiner.voice, avatar: examiner.avatar })
    .select("id")
    .single();
  if (error) throw error;
  redirect(`/practice/eo/${row.id}`);
}
