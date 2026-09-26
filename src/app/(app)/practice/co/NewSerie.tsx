"use client";

import { useEffect } from "react";
import { useFormStatus } from "react-dom";
import { useRouter } from "next/navigation";
import { requestNewSerie } from "./actions";

function Submit({ disabled }: { disabled?: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary" disabled={pending || disabled}>
      {pending ? "Preparing…" : "+ New série"}
    </button>
  );
}

export function NewSerieButton({ disabled }: { disabled?: boolean }) {
  return (
    <form action={requestNewSerie}>
      <Submit disabled={disabled} />
    </form>
  );
}

/** Shown while a requested série is being prepared; refreshes the page until it's ready. */
export function PreparingCard() {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 20_000);
    return () => clearInterval(id);
  }, [router]);
  return (
    <article className="glass grain flex flex-col justify-between rounded-3xl border-dashed p-7">
      <div className="flex items-start justify-between">
        <span className="flex h-10 items-end gap-[3px]" aria-hidden>
          {[0.5, 1, 0.7, 0.9, 0.45].map((h, i) => (
            <span key={i} className="eq-bar eq-on w-[3px] rounded-full bg-accent" style={{ height: `${h * 100}%`, animationDelay: `${i * 0.12}s` }} />
          ))}
        </span>
        <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">39 q · 35 min</span>
      </div>
      <div>
        <h2 className="mt-5 text-xl">Preparing your série…</h2>
        <p className="mt-1 text-sm text-muted">We&apos;re putting together a fresh épreuve from the question bank. It will appear here automatically — usually within 20 minutes.</p>
      </div>
    </article>
  );
}
