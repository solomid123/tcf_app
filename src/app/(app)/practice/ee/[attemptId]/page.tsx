import { after } from "next/server";
import { notFound, redirect } from "next/navigation";
import { EE_GRACE_MS, EE_MINUTES, msSince, normalizeAnswers, type EESujet } from "@/lib/ee";
import { gradeEE } from "@/lib/ee-grade";
import { getSession } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { Writer } from "./Writer";

export const metadata = { title: "Expression écrite — TCF Prep" };
export const maxDuration = 300; // the background evaluation runs after the response

export default async function EEWritePage({ params }: PageProps<"/practice/ee/[attemptId]">) {
  const { attemptId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(attemptId)) notFound();
  const { user } = await getSession();
  const admin = createAdminClient();
  const { data: a } = await admin
    .from("ee_attempts")
    .select("id, user_id, status, answers, created_at, t1:task1_id(id, task, prompt, sheet, documents), t2:task2_id(id, task, prompt, sheet, documents), t3:task3_id(id, task, prompt, sheet, documents)")
    .eq("id", attemptId)
    .maybeSingle();
  if (!a || a.user_id !== user.id) notFound();
  if (a.status !== "writing") redirect(`/practice/ee/review/${a.id}`);

  const deadline = new Date(a.created_at).getTime() + EE_MINUTES * 60_000;
  if (msSince(deadline) > EE_GRACE_MS) {
    // Time ran out while the candidate was away: hand in the last autosave, like a real invigilator.
    await admin.from("ee_attempts").update({ status: "submitted", submitted_at: new Date(deadline).toISOString() }).eq("id", a.id).eq("status", "writing");
    after(() => gradeEE(a.id));
    redirect(`/practice/ee/review/${a.id}`);
  }

  const one = <T,>(x: T | T[]) => (Array.isArray(x) ? x[0] : x);
  const sujets = [one(a.t1), one(a.t2), one(a.t3)] as unknown as EESujet[];
  return <Writer attemptId={a.id} deadline={deadline} sujets={sujets} initial={normalizeAnswers(a.answers)} />;
}
