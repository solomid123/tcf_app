"use client";

import { useFormStatus } from "react-dom";
import { startSimulation } from "./actions";

function Submit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" disabled={pending || disabled}>
      {pending ? "Preparing…" : "Start a simulation"}
    </button>
  );
}

export function StartButton({ disabled }: { disabled?: boolean }) {
  return (
    <form action={startSimulation}>
      <Submit disabled={disabled} />
    </form>
  );
}
