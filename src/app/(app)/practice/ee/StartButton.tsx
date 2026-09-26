"use client";

import { useFormStatus } from "react-dom";
import { startEE } from "./actions";

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" disabled={pending}>
      {pending ? "Preparing…" : label}
    </button>
  );
}

export function StartButton({ label = "Start an épreuve" }: { label?: string }) {
  return (
    <form action={startEE}>
      <Submit label={label} />
    </form>
  );
}
