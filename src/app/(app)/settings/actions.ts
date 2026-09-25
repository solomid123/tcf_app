"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FormState = { ok?: string; error?: string } | undefined;

async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/signout");
  return { supabase, user: data.user };
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length > 80) return { error: "Name is too long (max 80 characters)." };

  const { error } = await supabase.from("profiles").update({ full_name: fullName || null }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: "Profile saved." };
}

export async function updateGoals(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const nclcRaw = String(formData.get("target_nclc") ?? "");
  const dateRaw = String(formData.get("exam_date") ?? "");

  const target_nclc = nclcRaw ? Number(nclcRaw) : null;
  if (target_nclc !== null && (!Number.isInteger(target_nclc) || target_nclc < 1 || target_nclc > 12)) {
    return { error: "Target NCLC must be between 1 and 12." };
  }
  if (dateRaw && !/^\d{4}-\d{2}-\d{2}$/.test(dateRaw)) return { error: "Invalid exam date." };

  const { error } = await supabase
    .from("profiles")
    .update({ target_nclc, exam_date: dateRaw || null })
    .eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/", "layout");
  return { ok: "Goals saved." };
}

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const current = String(formData.get("current_password") ?? "");
  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (next.length < 8) return { error: "New password must be at least 8 characters." };
  if (next !== confirm) return { error: "Passwords do not match." };

  // Users who already have a password must prove they know it.
  const hasPassword = user.app_metadata?.providers?.includes("email");
  if (hasPassword) {
    const { error } = await supabase.auth.signInWithPassword({ email: user.email!, password: current });
    if (error) return { error: "Current password is incorrect." };
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: error.message };
  return { ok: hasPassword ? "Password updated." : "Password set — you can now also sign in with email." };
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "SUPPRIMER") {
    return { error: "Type SUPPRIMER to confirm." };
  }

  const admin = createAdminClient();
  const { data: files } = await admin.storage.from("avatars").list(user.id);
  if (files?.length) await admin.storage.from("avatars").remove(files.map((f) => `${user.id}/${f.name}`));

  const { error } = await admin.auth.admin.deleteUser(user.id); // cascades to profiles
  if (error) return { error: error.message };

  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
