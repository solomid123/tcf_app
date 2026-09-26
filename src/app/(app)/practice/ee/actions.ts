"use server";

import { after } from "next/server";
import { redirect } from "next/navigation";
import { EE_GRACE_MS, EE_MINUTES, normalizeAnswers } from "@/lib/ee";
import { gradeEE } from "@/lib/ee-grade";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Each épreuve costs an AI evaluation, so cap how many a user can start per day. */
const DAILY_EPREUVES = 5;
const ID = /^[0-9a-f-]{36}$/i;

async function userId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/signout");
  return data.user.id;
}

async function ownAttempt(id: string, uid: string) {
  if (!ID.test(id)) throw new Error("Unknown épreuve");
  const { data } = await createAdminClient().from("ee_attempts").select("id, user_id, status, created_at, submitted_at").eq("id", id).maybeSingle();
  if (!data || data.user_id !== uid) throw new Error("Unknown épreuve");
  return data;
}

const expired = (createdAt: string) => Date.now() > new Date(createdAt).getTime() + EE_MINUTES * 60_000 + EE_GRACE_MS;

export async function startEE() {
  const uid = await userId();
  const admin = createAdminClient();

  // Resume an épreuve still in progress rather than starting a second clock.
  const { data: open } = await admin.from("ee_attempts").select("id").eq("user_id", uid).eq("status", "writing").maybeSingle();
  if (open) redirect(`/practice/ee/${open.id}`);

  const since = new Date(Date.now() - 24 * 3600_000).toISOString();
  const { count } = await admin.from("ee_attempts").select("id", { count: "exact", head: true }).eq("user_id", uid).gte("created_at", since);
  if ((count ?? 0) >= DAILY_EPREUVES) redirect("/practice/ee?limit=1");

  // Sujets this user hasn't had yet (fall back to all once they've seen everything).
  const { data: past } = await admin.from("ee_attempts").select("task1_id, task2_id, task3_id").eq("user_id", uid);
  const used = new Set((past ?? []).flatMap((p) => [p.task1_id, p.task2_id, p.task3_id]));
  const { data: sujets } = await admin.from("ee_sujets").select("id, task");
  const pick = (task: number) => {
    const all = (sujets ?? []).filter((s) => s.task === task);
    const fresh = all.filter((s) => !used.has(s.id));
    const pool = fresh.length ? fresh : all;
    return pool[Math.floor(Math.random() * pool.length)]?.id;
  };
  const [task1_id, task2_id, task3_id] = [pick(1), pick(2), pick(3)];
  if (!task1_id || !task2_id || !task3_id) throw new Error("No Expression écrite sujets available");

  const { data: row, error } = await admin.from("ee_attempts").insert({ user_id: uid, task1_id, task2_id, task3_id }).select("id").single();
  if (error) throw error;
  redirect(`/practice/ee/${row.id}`);
}

/** Autosave. Refused once the hour (plus grace) is over. */
export async function saveEE(id: string, raw: unknown) {
  const uid = await userId();
  const a = await ownAttempt(id, uid);
  if (a.status !== "writing" || expired(a.created_at)) return { ok: false };
  await createAdminClient().from("ee_attempts").update({ answers: normalizeAnswers(raw) }).eq("id", id).eq("status", "writing");
  return { ok: true };
}

/** Hands in the copy and grades it in the background. After the deadline the last autosave is kept. */
export async function submitEE(id: string, raw: unknown) {
  const uid = await userId();
  const a = await ownAttempt(id, uid);
  if (a.status === "writing") {
    const late = expired(a.created_at);
    await createAdminClient()
      .from("ee_attempts")
      .update({ status: "submitted", submitted_at: new Date().toISOString(), ...(late ? {} : { answers: normalizeAnswers(raw) }) })
      .eq("id", id)
      .eq("status", "writing");
    after(() => gradeEE(id));
  }
  redirect(`/practice/ee/review/${id}`);
}

/** Retries an evaluation that failed or got stuck (e.g. the server restarted mid-grading). */
export async function regradeEE(id: string) {
  const uid = await userId();
  const a = await ownAttempt(id, uid);
  const stuck = a.status === "submitted" && Date.now() - new Date(a.submitted_at ?? 0).getTime() > 5 * 60_000;
  if (a.status === "failed" || stuck) {
    await createAdminClient().from("ee_attempts").update({ status: "submitted" }).eq("id", id);
    after(() => gradeEE(id));
  }
  redirect(`/practice/ee/review/${id}`);
}
