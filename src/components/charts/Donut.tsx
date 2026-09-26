export type Segment = { label: string; value: number; color: string };

// Ring chart with small gaps between segments.
export function Donut({ segments, center, caption, size = 200 }: { segments: Segment[]; center: string; caption: string; size?: number }) {
  const r = 70;
  const stroke = 24;
  const C = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0);
  const visible = segments.filter((s) => s.value > 0);
  const gap = visible.length > 1 ? 5 : 0;

  let offset = 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="100" cy="100" r={r} fill="none" style={{ stroke: "var(--line)" }} strokeWidth={stroke} />
        {total > 0 &&
          visible.map((s) => {
            const len = (s.value / total) * C;
            const el = (
              <circle
                key={s.label}
                cx="100" cy="100" r={r} fill="none"
                stroke={s.color} strokeWidth={stroke}
                strokeDasharray={`${Math.max(len - gap, 0.01)} ${C}`}
                strokeDashoffset={-offset}
                style={{ filter: `drop-shadow(0 0 6px ${s.color}55)` }}
              />
            );
            offset += len;
            return el;
          })}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className={center.length > 4 ? "text-2xl" : "text-3xl"}>{center}</span>
        <span className="mt-1 text-xs text-muted">{caption}</span>
      </div>
    </div>
  );
}
