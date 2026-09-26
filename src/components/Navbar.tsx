import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Logo } from "./Logo";
import { ThemeToggle } from "./theme/ThemeToggle";

const links = [
  { href: "/#skills", label: "Skills" },
  { href: "/#exams", label: "Mock exams" },
  { href: "/#scoring", label: "Scoring" },
  { href: "/#faq", label: "FAQ" },
];

export async function Navbar() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims);

  return (
    <header className="sticky top-4 z-50 mx-auto w-full max-w-6xl px-4">
      <nav className="glass grain flex items-center justify-between rounded-full py-2.5 pl-5 pr-2.5">
        <Logo />
        <ul className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="text-[12px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-fg"
              >
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className="btn btn-primary !py-2">
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn !px-4 !py-2 text-[12px] uppercase tracking-[0.18em] text-fg/80 hover:text-fg">
                Login
              </Link>
              <Link href="/signup" className="btn btn-primary !py-2">
                Start free
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
