"use client";

import { useActionState } from "react";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

type Props = { mode: "login" | "signup"; next?: string; initialError?: string };

export function AuthForm({ mode, next, initialError }: Props) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    action,
    initialError ? { error: initialError } : undefined,
  );

  if (state?.message) {
    return (
      <div className="rounded-2xl border border-accent/30 bg-accent/10 p-5 text-sm leading-relaxed">
        <p className="mb-1 text-base">Presque fini !</p>
        {state.message}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next ?? "/dashboard"} />
      {mode === "signup" && (
        <Field label="Full name">
          <input name="full_name" autoComplete="name" className="input" placeholder="Marie Tremblay" />
        </Field>
      )}
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className="input" placeholder="vous@exemple.com" />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          required
          minLength={mode === "signup" ? 8 : undefined}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="input"
          placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
        />
      </Field>

      {state?.error && (
        <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {state.error}
        </p>
      )}

      <button type="submit" disabled={pending} className="btn btn-primary mt-2 w-full !py-3">
        {pending ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-[0.18em] text-muted">{label}</span>
      {children}
    </label>
  );
}
