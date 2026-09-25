import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Current user + profile, deduplicated per request. Redirects to login if signed out. */
export const getSession = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url, target_nclc, exam_date")
    .eq("id", data.user.id)
    .maybeSingle();
  return { supabase, user: data.user, profile };
});
