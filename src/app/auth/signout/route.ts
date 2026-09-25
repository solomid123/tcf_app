import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Clears a stale/invalid session (e.g. the user was deleted elsewhere) and sends them to login.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const res = NextResponse.redirect(new URL("/login", request.url));
  // Belt and braces: drop any remaining Supabase auth cookies.
  request.cookies.getAll().forEach((c) => {
    if (c.name.startsWith("sb-")) res.cookies.delete(c.name);
  });
  return res;
}
