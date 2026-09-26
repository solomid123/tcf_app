"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

/** Shown while the jury evaluates the recording; re-checks every few seconds. */
export function Waiting() {
  const router = useRouter();
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    const tick = setInterval(() => setSecs((s) => s + 1), 1000);
    const poll = setInterval(() => router.refresh(), 4000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [router]);
  return (
    <div className="glass grain mt-8 flex max-w-2xl items-center gap-5 rounded-3xl p-8">
      <span className="h-10 w-10 shrink-0 animate-spin rounded-full border-2 border-line border-t-accent" />
      <div>
        <p className="text-lg">The jury is evaluating your épreuve…</p>
        <p className="mt-1 text-sm text-muted">
          This usually takes under a minute. {secs > 90 && "It's taking longer than usual, you can leave this page and come back later."}
        </p>
      </div>
    </div>
  );
}
