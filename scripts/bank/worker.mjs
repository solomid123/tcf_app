// Keeps the "New série" pool topped up and serves users who asked while it was empty.
//
//   node --env-file=.env.local scripts/bank/worker.mjs [--pool 2] [--until-idle]
//
// Runs forever by default (put it on any always-on machine or a small server). --until-idle exits once the
// pool is full and nobody is waiting, which suits a scheduled job (cron, GitHub Actions, Task Scheduler).
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const arg = (name, def) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? def : process.argv[i + 1];
};
const POOL_TARGET = Number(arg("pool", 2));
const UNTIL_IDLE = process.argv.includes("--until-idle");
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, { auth: { persistSession: false } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...m) => console.log(new Date().toISOString().slice(11, 19), ...m);

async function count(table, filters) {
  let q = supabase.from(table).select("id", { count: "exact", head: true });
  for (const [k, v] of Object.entries(filters)) q = q.eq(k, v);
  const { count: n, error } = await q;
  if (error) throw error;
  return n ?? 0;
}

// Give pooled séries to waiting users, oldest request first.
async function serveQueue() {
  const { data: queue } = await supabase.from("bank_requests").select("id, user_id").eq("status", "queued").eq("skill", "CO").order("created_at");
  for (const r of queue ?? []) {
    const { data: setId, error } = await supabase.rpc("claim_pool_set", { p_user: r.user_id, p_skill: "CO" });
    if (error) throw error;
    if (!setId) return;
    await supabase.from("bank_requests").update({ status: "done", set_id: setId, updated_at: new Date().toISOString() }).eq("id", r.id);
    log(`série handed to a waiting user (request ${r.id.slice(0, 8)})`);
  }
}

function generate(number) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ["scripts/bank/generate-co.mjs", "--serie", String(number), "--status", "pool"], { stdio: "inherit", env: process.env });
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function nextNumber() {
  const { data } = await supabase.from("bank_sets").select("number").eq("skill", "CO").order("number", { ascending: false }).limit(1);
  return (data?.[0]?.number ?? 0) + 1;
}

for (;;) {
  try {
    await serveQueue();
    const waiting = await count("bank_requests", { status: "queued", skill: "CO" });
    const pooled = await count("bank_sets", { status: "pool", skill: "CO" });
    if (waiting + POOL_TARGET > pooled) {
      const n = await nextNumber();
      log(`pool ${pooled}/${POOL_TARGET}, ${waiting} waiting — generating série #${n}`);
      let ok = false;
      // The generator caches its progress, so a retry resumes where it stopped.
      for (let attempt = 1; attempt <= 3 && !ok; attempt++) ok = await generate(n);
      if (!ok) {
        log(`série #${n} failed 3 times — pausing 10 minutes`);
        await sleep(10 * 60_000);
      }
      continue;
    }
    if (UNTIL_IDLE) {
      log(`pool full (${pooled}/${POOL_TARGET}), nobody waiting — done`);
      break;
    }
  } catch (e) {
    log("error:", e.message);
  }
  await sleep(30_000);
}
