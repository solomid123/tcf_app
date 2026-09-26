import Link from "next/link";
import { publishedSets } from "@/lib/bank";
import { getSession } from "@/lib/session";
import { nclcLabel } from "@/lib/tcf";

export const metadata = { title: "Compréhension orale — TCF Prep" };

export default async function COSetsPage() {
  const { supabase, user } = await getSession();
  const sets = await publishedSets("CO");
  const { data: attempts } = await supabase
    .from("attempts")
    .select("id, set_id, score, nclc, completed_at")
    .eq("user_id", user.id)
    .eq("skill", "CO")
    .not("set_id", "is", null)
    .order("completed_at", { ascending: false });

  return (
    <>
      <Link href="/practice" className="text-sm text-muted hover:text-fg">← Practice</Link>
      <p className="eyebrow mt-6">Compréhension orale</p>
      <h1 className="mt-3 text-4xl md:text-5xl"><span className="text-chrome">Listening séries</span></h1>
      <p className="mt-3 max-w-xl text-muted">Full épreuves in the TCF Canada format: 39 questions from A1 to C2, 35 minutes, each recording heard once.</p>

      {sets.length === 0 ? (
        <p className="glass mt-10 rounded-3xl p-8 text-muted">No séries published yet. Check back soon.</p>
      ) : (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sets.map((s) => {
            const mine = (attempts ?? []).filter((a) => a.set_id === s.id);
            const best = mine.reduce<(typeof mine)[number] | null>((b, a) => (!b || Number(a.score) > Number(b.score) ? a : b), null);
            return (
              <article key={s.id} className="glass grain flex flex-col rounded-3xl p-7">
                <div className="flex items-start justify-between">
                  <span className="text-chrome text-4xl font-bold">{String(s.number).padStart(2, "0")}</span>
                  <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">39 q · 35 min</span>
                </div>
                <h2 className="mt-5 text-xl">{s.title}</h2>
                <p className="mt-1 text-sm text-muted">
                  {best ? `Best ${Math.round(Number(best.score))}/699 · NCLC ${nclcLabel(best.nclc)} · ${mine.length} attempt${mine.length > 1 ? "s" : ""}` : "Not attempted yet"}
                </p>
                <div className="mt-6 flex gap-3 pt-2">
                  <Link href={`/practice/co/${s.id}`} className="btn btn-primary flex-1">{best ? "Retake" : "Start"}</Link>
                  {best && <Link href={`/practice/co/review/${mine[0].id}`} className="btn btn-glass">Review</Link>}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
