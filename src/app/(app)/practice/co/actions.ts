"use server";

import { redirect } from "next/navigation";
import { gradeCO, loadSet } from "@/lib/bank";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { nclcFor } from "@/lib/tcf";

export async function submitCO(setId: string, rawAnswers: unknown, startedAt: number, examConditions: boolean) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/signout");

  const loaded = await loadSet(setId, data.user.id);
  if (!loaded) throw new Error("Unknown série");
  const { items } = loaded;

  const answers = Array.from({ length: items.length }, (_, i) => {
    const a = Array.isArray(rawAnswers) ? rawAnswers[i] : null;
    return Number.isInteger(a) && a >= 0 && a <= 3 ? (a as number) : null;
  });
  const { points, score, correct, total } = gradeCO(items, answers);

  const now = Date.now();
  const started = Number.isFinite(startedAt) && startedAt < now && now - startedAt < 6 * 3600_000 ? startedAt : now;

  // Attempts are written with the admin client only, so scores can't be forged from the browser.
  const { data: attempt, error } = await createAdminClient()
    .from("attempts")
    .insert({
      user_id: data.user.id,
      mode: "practice",
      skill: "CO",
      set_id: setId,
      score,
      percent: Math.round((correct / total) * 10000) / 100,
      nclc: nclcFor("CO", score),
      correct,
      total,
      duration_seconds: Math.round((now - started) / 1000),
      started_at: new Date(started).toISOString(),
      completed_at: new Date(now).toISOString(),
      details: { answers, points, examConditions },
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  redirect(`/practice/co/review/${attempt.id}`);
}

const DAILY_NEW_SERIES = 3;

/** Hands the user a fresh série from the pool, or queues one if the pool is empty. */
export async function requestNewSerie() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/signout");
  const userId = data.user.id;
  const admin = createAdminClient();

  // Already waiting for one: nothing to do, the page shows its progress.
  const { count: queued } = await admin
    .from("bank_requests")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "queued");
  if (queued) redirect("/practice/co");

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count: today } = await admin
    .from("bank_sets")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", userId)
    .gte("claimed_at", since);
  if ((today ?? 0) >= DAILY_NEW_SERIES) redirect("/practice/co?limit=1");

  const { data: setId, error } = await admin.rpc("claim_pool_set", { p_user: userId, p_skill: "CO" });
  if (error) throw new Error(error.message);
  if (setId) redirect(`/practice/co/${setId}`);

  const { error: qErr } = await admin.from("bank_requests").insert({ user_id: userId, skill: "CO" });
  if (qErr) throw new Error(qErr.message);
  redirect("/practice/co");
}
