import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";
export type ItemKind = "image_description" | "spoken_response" | "short_document" | "long_document";

export type BankItem = {
  id: string;
  position: number;
  level: Level;
  points: number;
  kind: ItemKind;
  instruction: string;
  question: string | null;
  options: string[];
  options_spoken: boolean;
  answer: number;
  explanation: string;
  transcript: { speaker: string; role: string; text: string }[];
  audio_path: string | null;
  image_path: string | null;
};

/** What the player is allowed to see before submission — no key, no transcript, no explanation. */
export type PublicItem = {
  position: number;
  level: Level;
  kind: ItemKind;
  instruction: string;
  question: string | null;
  /** null when the propositions are only heard (image and question–réponse items). */
  options: string[] | null;
  audio: string | null;
  image: string | null;
};

export const bankUrl = (path: string | null) =>
  path ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/bank/${path}` : null;

export async function publishedSets(skill: "CO" | "CE") {
  const { data } = await createAdminClient()
    .from("bank_sets")
    .select("id, number, title")
    .eq("skill", skill)
    .eq("status", "published")
    .order("number");
  return data ?? [];
}

export async function loadSet(setId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(setId)) return null;
  const admin = createAdminClient();
  const { data: set } = await admin.from("bank_sets").select("id, skill, number, title, status").eq("id", setId).maybeSingle();
  if (!set || set.status !== "published") return null;
  const { data: items } = await admin.from("bank_items").select("*").eq("set_id", setId).order("position");
  return { set, items: (items ?? []) as BankItem[] };
}

export const toPublic = (it: BankItem): PublicItem => ({
  position: it.position,
  level: it.level,
  kind: it.kind,
  instruction: it.instruction,
  question: it.question,
  options: it.options_spoken ? null : it.options,
  audio: bankUrl(it.audio_path),
  image: bankUrl(it.image_path),
});

/** TCF reports Compréhension scores on a 100–699 scale. */
export function gradeCO(items: BankItem[], answers: (number | null)[]) {
  let points = 0;
  let correct = 0;
  items.forEach((it, i) => {
    if (answers[i] === it.answer) {
      points += it.points;
      correct++;
    }
  });
  return { points, score: Math.max(100, points), correct, total: items.length };
}
