import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader({ active, avatarUrl, name }: { active: string; avatarUrl?: string | null; name?: string | null }) {
  return (
    <header className="mx-auto mt-4 w-full max-w-6xl px-4">
      <nav className="glass grain flex items-center justify-between rounded-full py-2.5 pl-5 pr-2.5">
        <Logo />
        <ul className="hidden items-center gap-8 sm:flex">
          {nav.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                className={`text-[12px] uppercase tracking-[0.18em] transition-colors ${active === n.href ? "text-fg" : "text-muted hover:text-fg"}`}
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3">
          <Link href="/settings" aria-label="Settings"><Avatar url={avatarUrl} name={name} /></Link>
          <form action={signOut}>
            <button className="btn btn-glass !py-2 text-sm">Sign out</button>
          </form>
        </div>
      </nav>
    </header>
  );
}
