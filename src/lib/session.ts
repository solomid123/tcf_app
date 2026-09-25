import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Current user + profile, deduplicated per request. Redirects to login if signed out. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  // A token can look valid to the proxy but belong to a deleted user — clear it to avoid a redirect loop.
  if (!data.user) redirect("/auth/signout");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, target_nclc, exam_date")
    .eq("id", data.user.id)
    .maybeSingle();
  return { supabase, user: data.user, profile };
});
