"use client";

import { useActionState } from "react";
import { changePassword, deleteAccount, updateGoals, updateProfile, type FormState } from "./actions";

function Status({ state }: { state: FormState }) {
  if (state?.error) return <p role="alert" className="text-sm text-red-300">{state.error}</p>;
  if (state?.ok) return <p role="status" className="text-sm text-emerald-300">✓ {state.ok}</p>;
  return null;
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

function Actions({ pending, state, label }: { pending: boolean; state: FormState; label: string }) {
  return (
    <div className="flex items-center justify-end gap-4 pt-2">
      <Status state={state} />
      <button type="submit" disabled={pending} className="btn btn-primary !py-2.5">
        {pending ? "Saving…" : label}
      </button>
    </div>
  );
}

export function ProfileForm({ fullName, email }: { fullName: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name">
          <input name="full_name" defaultValue={fullName} maxLength={80} autoComplete="name" className="input" />
        </Field>
        <Field label="Email" hint="Email cannot be changed here yet.">
          <input value={email} disabled className="input cursor-not-allowed opacity-60" />
        </Field>
      </div>
      <Actions pending={pending} state={state} label="Save profile" />
    </form>
  );
}

const NCLC_OPTIONS = [4, 5, 6, 7, 8, 9, 10, 11, 12];

export function GoalsForm({ targetNclc, examDate }: { targetNclc: number | null; examDate: string | null }) {
  const [state, action, pending] = useActionState(updateGoals, undefined);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Target NCLC" hint="Express Entry usually needs NCLC 7+ for maximum points.">
          <select name="target_nclc" defaultValue={targetNclc ?? ""} className="input appearance-none">
            <option value="" className="bg-neutral-900">Not set</option>
            {NCLC_OPTIONS.map((n) => (
              <option key={n} value={n} className="bg-neutral-900">NCLC {n}</option>
            ))}
          </select>
        </Field>
        <Field label="Exam date" hint="We will use this to pace your study plan.">
          <input type="date" name="exam_date" min={today} defaultValue={examDate ?? ""} className="input [color-scheme:dark]" />
        </Field>
      </div>
      <Actions pending={pending} state={state} label="Save goals" />
    </form>
  );
}

export function PasswordForm({ hasPassword }: { hasPassword: boolean }) {
  const [state, action, pending] = useActionState(changePassword, undefined);
  return (
    <form action={action} className="space-y-4" key={state?.ok}>
      {!hasPassword && (
        <p className="text-sm text-muted">You signed up with Google. Set a password to also sign in with your email.</p>
      )}
      <div className={`grid gap-4 ${hasPassword ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
        {hasPassword && (
          <Field label="Current password">
            <input type="password" name="current_password" required autoComplete="current-password" className="input" />
          </Field>
        )}
        <Field label="New password">
          <input type="password" name="new_password" required minLength={8} autoComplete="new-password" className="input" />
        </Field>
        <Field label="Confirm">
          <input type="password" name="confirm_password" required minLength={8} autoComplete="new-password" className="input" />
        </Field>
      </div>
      <Actions pending={pending} state={state} label={hasPassword ? "Update password" : "Set password"} />
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  return (
    <form action={action} className="space-y-4">
      <p className="text-sm leading-relaxed text-muted">
        This permanently deletes your account, profile and all your exam history. This cannot be undone.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <Field label="Type SUPPRIMER to confirm">
          <input name="confirm" required autoComplete="off" className="input sm:w-64" placeholder="SUPPRIMER" />
        </Field>
        <button
          type="submit"
          disabled={pending}
          className="btn border border-red-400/40 bg-red-500/15 !py-3 text-red-200 hover:bg-red-500/25 disabled:opacity-60"
        >
          {pending ? "Deleting…" : "Delete my account"}
        </button>
      </div>
      <Status state={state} />
    </form>
  );
}
