import Link from "next/link";
import { signOut } from "@/app/auth/actions";
import { Avatar } from "./Avatar";
import { Logo } from "./Logo";
import { NavLinks } from "./NavLinks";

export function AppHeader({ avatarUrl, name }: { avatarUrl?: string | null; name?: string | null }) {
  return (
    <header className="z-50 mx-auto mt-4 md:sticky md:top-4 w-full max-w-6xl px-4">
      <nav className="glass grain flex items-center justify-between gap-3 rounded-full py-2.5 pl-5 pr-2.5">
        <Logo />
        <div className="hidden md:block"><NavLinks /></div>
        <div className="flex items-center gap-3">
          <Link href="/settings" aria-label="Settings"><Avatar url={avatarUrl} name={name} /></Link>
          <form action={signOut}>
            <button className="btn btn-glass !py-2 text-sm">Sign out</button>
          </form>
        </div>
      </nav>
      <div className="glass mt-2 overflow-x-auto rounded-full p-1.5 md:hidden"><NavLinks /></div>
    </header>
  );
}
