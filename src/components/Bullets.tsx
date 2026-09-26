// List with small glowing dot markers, used instead of dash bullets across the site.
export function Bullets({ items, className = "" }: { items: string[]; className?: string }) {
  return (
    <ul className={className}>
      {items.map((it) => (
        <li key={it} className="flex items-baseline gap-3">
          <span aria-hidden className="relative top-[-0.1em] h-1.5 w-1.5 shrink-0 rounded-full bg-accent shadow-[0_0_8px_var(--accent)]" />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
