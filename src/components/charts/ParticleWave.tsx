// Dotted "particle band" sparkline — pure SVG, deterministic so it renders on the server.

function prng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEMO = [42, 58, 47, 66, 52, 71, 60, 78];

/** Bucket-average a long series down to at most `max` points so the wave stays smooth. */
function smooth(values: number[], max: number) {
  if (values.length <= max) return values;
  const size = values.length / max;
  return Array.from({ length: max }, (_, i) => {
    const chunk = values.slice(Math.floor(i * size), Math.floor((i + 1) * size));
    return chunk.reduce((a, b) => a + b, 0) / chunk.length;
  });
}

type Props = {
  values: number[]; // 0–100
  seed?: number;
  from?: string;
  to?: string;
  width?: number;
  height?: number;
  count?: number;
};

export function ParticleWave({ values, seed = 1, from = "#3b82f6", to = "#a5b4fc", width = 420, height = 110, count = 650 }: Props) {
  const empty = values.length < 2;
  const series = smooth(empty ? DEMO : values, 9);
  const lo = Math.max(0, Math.min(...series) - 12);
  const hi = Math.min(100, Math.max(...series) + 12);
  const span = Math.max(hi - lo, 1);

  // cosine-interpolated curve through the series
  const curve = (t: number) => {
    const p = t * (series.length - 1);
    const i = Math.min(Math.floor(p), series.length - 2);
    const f = (1 - Math.cos((p - i) * Math.PI)) / 2;
    const v = series[i] * (1 - f) + series[i + 1] * f;
    return height - 22 - ((v - lo) / span) * (height - 44);
  };

  const rand = prng(seed * 9973 + series.length);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const dots: string[] = [];
  for (let n = 0; n < count; n++) {
    const t = rand();
    const echo = rand() < 0.35;
    const thickness = 6 + 10 * Math.sin(t * Math.PI * 2.2 + seed) ** 2;
    const offset = echo ? 14 * Math.sin(t * Math.PI * 2.6 + seed) : 0;
    const x = t * width;
    const y = curve(t) + offset + gauss() * thickness;
    const r = 0.4 + rand() * 1.1;
    const o = 0.25 + rand() * 0.75;
    dots.push(`${x.toFixed(1)},${y.toFixed(1)},${r.toFixed(2)},${o.toFixed(2)}`);
  }

  const id = `pw${seed}`;
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={`h-full w-full light:saturate-150 light:brightness-90 ${empty ? "opacity-25" : ""}`} preserveAspectRatio="xMidYMax slice" aria-hidden>
      <defs>
        <linearGradient id={`${id}c`} gradientUnits="userSpaceOnUse" x1="0" x2={width} y1="0" y2="0">
          <stop offset="0" stopColor={from} />
          <stop offset="1" stopColor={to} />
        </linearGradient>
        <linearGradient id={`${id}f`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.05" />
          <stop offset="0.35" stopColor="#fff" stopOpacity="1" />
        </linearGradient>
        <mask id={`${id}m`}>
          <rect width={width} height={height} fill={`url(#${id}f)`} />
        </mask>
      </defs>
      <g fill={`url(#${id}c)`} mask={`url(#${id}m)`}>
        {dots.map((d, i) => {
          const [cx, cy, r, o] = d.split(",");
          return <circle key={i} cx={cx} cy={cy} r={r} opacity={o} />;
        })}
      </g>
    </svg>
  );
}
