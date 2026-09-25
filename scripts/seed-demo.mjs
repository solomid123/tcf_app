// Seeds realistic demo practice + exam data for one user (dev only).
// Usage: node --env-file=.env.local scripts/seed-demo.mjs you@example.com [--clear]
import { createClient } from "@supabase/supabase-js";

const [email, flag] = process.argv.slice(2);
if (!email) throw new Error("Usage: seed-demo.mjs <email> [--clear]");
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY);

const { data: list, error } = await db.auth.admin.listUsers({ perPage: 1000 });
if (error) throw error;
const user = list.users.find((u) => u.email === email);
if (!user) throw new Error(`No user with email ${email}`);

await db.from("attempts").delete().eq("user_id", user.id);
await db.from("exam_sittings").delete().eq("user_id", user.id);
if (flag === "--clear") { console.log("Cleared demo data for", email); process.exit(0); }

const TABLE = {
  CO: [[549, 10], [523, 9], [503, 8], [458, 7], [398, 6], [369, 5], [331, 4]],
  CE: [[549, 10], [524, 9], [499, 8], [453, 7], [406, 6], [375, 5], [342, 4]],
  EE: [[16, 10], [14, 9], [12, 8], [10, 7], [7, 6], [6, 5], [4, 4]],
  EO: [[16, 10], [14, 9], [12, 8], [10, 7], [7, 6], [6, 5], [4, 4]],
};
const nclc = (s, v) => TABLE[s].find(([m]) => v >= m)?.[1] ?? 0;
const DAY = 86_400_000;
const ago = (d) => new Date(Date.now() - d * DAY).toISOString();
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const skills = ["CO", "CE", "EE", "EO"];
const weight = { CO: 0.35, CE: 0.35, EE: 0.18, EO: 0.12 };

// Practice: ~45 sessions over 60 days, improving over time
const practice = [];
for (let i = 0; i < 45; i++) {
  const days = 60 - i * 1.3 - Math.random();
  const r = Math.random();
  let acc = 0;
  const skill = skills.find((s) => (acc += weight[s]) >= r) ?? "CO";
  const pct = clamp(48 + (60 - days) * 0.45 + (Math.random() - 0.5) * 22, 15, 98);
  const total = skill === "CO" || skill === "CE" ? 20 : 3;
  practice.push({
    user_id: user.id, mode: "practice", skill, percent: pct.toFixed(2),
    correct: Math.round((pct / 100) * total), total, duration_seconds: 600 + Math.round(Math.random() * 900),
    completed_at: ago(days), started_at: ago(days + 0.01),
  });
}
const { error: pErr } = await db.from("attempts").insert(practice);
if (pErr) throw pErr;

// Exams: 3 sittings, improving
for (const [i, days] of [40, 20, 4].entries()) {
  const results = skills.map((skill) => {
    const pct = clamp(55 + i * 8 + (Math.random() - 0.5) * 12, 20, 97);
    const score = skill === "CO" || skill === "CE" ? Math.round(100 + (pct / 100) * 599) : Math.round((pct / 100) * 20);
    return { skill, pct, score, nclc: nclc(skill, score) };
  });
  const overall = Math.min(...results.map((r) => r.nclc));
  const { data: sitting, error: sErr } = await db.from("exam_sittings").insert({
    user_id: user.id, status: "completed", overall_nclc: overall, started_at: ago(days + 0.12), completed_at: ago(days),
  }).select("id").single();
  if (sErr) throw sErr;
  const { error: aErr } = await db.from("attempts").insert(results.map((r, k) => ({
    user_id: user.id, sitting_id: sitting.id, mode: "exam", skill: r.skill, score: r.score,
    percent: r.pct.toFixed(2), nclc: r.nclc, completed_at: ago(days + 0.1 - k * 0.03), started_at: ago(days + 0.12),
  })));
  if (aErr) throw aErr;
}
console.log(`Seeded ${practice.length} practice sessions + 3 exam sittings for ${email}`);
