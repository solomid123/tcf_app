// Applies every SQL file in supabase/migrations in order.
// Usage: node --env-file=.env.local scripts/migrate.mjs
import { readdir, readFile } from "node:fs/promises";
import pg from "pg";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();
const dir = new URL("../supabase/migrations/", import.meta.url);
for (const file of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
  process.stdout.write(`Applying ${file}... `);
  await client.query(await readFile(new URL(file, dir), "utf8"));
  console.log("ok");
}
await client.end();
