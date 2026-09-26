"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/practice", label: "Practice" },
  { href: "/exams", label: "Exams" },
  { href: "/settings", label: "Settings" },
];

export function NavLinks() {
  const path = usePathname();
  return (
    <ul className="flex items-center gap-1">
      {nav.map((n) => {
        const active = path === n.href || path.startsWith(`${n.href}/`);
        return (
          <li key={n.href}>
            <Link
              href={n.href}
              aria-current={active ? "page" : undefined}
              className={`rounded-full px-4 py-2 text-[12px] uppercase tracking-[0.18em] transition-colors ${
                active ? "bg-tint text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] light:shadow-[0_2px_10px_-3px_rgba(40,55,120,0.25)]" : "text-muted hover:text-fg"
              }`}
            >
              {n.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
