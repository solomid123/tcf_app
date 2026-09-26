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

  const loaded = await loadSet(setId);
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
