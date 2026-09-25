import Link from "next/link";

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-fg">
      <span className="grid h-8 w-8 place-items-center rounded-xl glass text-[11px] font-bold tracking-wider">
        TCF
      </span>
      <span className="text-lg tracking-wide">
        Prep<span className="text-muted">.ca</span>
      </span>
    </Link>
  );
}
