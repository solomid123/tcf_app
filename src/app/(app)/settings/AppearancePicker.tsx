"use client";

import type { ThemePref } from "@/lib/theme";
import { useTheme } from "@/components/theme/useTheme";

const options: { value: ThemePref; label: string; hint: string }[] = [
  { value: "dark", label: "Dark", hint: "Graphite glass" },
  { value: "light", label: "Light", hint: "White glass, dark text" },
  { value: "system", label: "System", hint: "Match your device" },
];

// Miniature of the UI in each theme, so the choice is visual.
function Preview({ value }: { value: ThemePref }) {
  const light = "bg-[linear-gradient(160deg,#eef2ff,#c9d4f6)]";
  const dark = "bg-[radial-gradient(ellipse_at_top,#23252e,#0b0b0d)]";
  const card = (l: boolean) => (l ? "bg-white/80 border-white" : "bg-white/10 border-white/15");
  const bar = (l: boolean) => (l ? "bg-[#0f1424]/70" : "bg-white/70");
  const half = (l: boolean, extra = "") => (
    <div className={`flex h-full flex-col gap-1.5 p-2.5 ${l ? light : dark} ${extra}`}>
      <div className={`h-2 w-10 rounded-full ${bar(l)}`} />
      <div className={`flex-1 rounded-md border ${card(l)}`} />
    </div>
  );
  return (
    <div className="h-20 overflow-hidden rounded-xl border border-line">
      {value === "system" ? (
        <div className="grid h-full grid-cols-2">{half(false)}{half(true)}</div>
      ) : (
        half(value === "light")
      )}
    </div>
  );
}

export function AppearancePicker() {
  const { pref, setPref } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="grid gap-3 sm:grid-cols-3">
      {options.map((o) => {
        const on = pref === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setPref(o.value)}
            className={`rounded-2xl border p-3 text-left transition-colors ${
              on ? "border-accent/60 bg-accent/10" : "border-line hover:bg-tint/50"
            }`}
          >
            <Preview value={o.value} />
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm">{o.label}</span>
              <span className={`h-4 w-4 rounded-full border ${on ? "border-accent bg-accent shadow-[inset_0_0_0_3px_var(--bg)]" : "border-line"}`} />
            </div>
            <p className="mt-0.5 text-xs text-muted">{o.hint}</p>
          </button>
        );
      })}
    </div>
  );
}
