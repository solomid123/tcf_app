import Link from "next/link";
import { Backdrop } from "@/components/Backdrop";
import { Logo } from "@/components/Logo";
import { TrafficLights } from "@/components/TrafficLights";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <>
      <Backdrop />
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="mb-8"><Logo /></div>
        <div className="glass grain animate-fade-up w-full max-w-md overflow-hidden rounded-[2rem]">
          <div className="flex items-center justify-between border-b border-line px-6 py-4">
            <TrafficLights />
            <Link href="/" className="text-xs uppercase tracking-[0.2em] text-muted hover:text-fg">← Home</Link>
          </div>
          <div className="px-8 py-10">
            <h1 className="text-3xl"><span className="text-chrome">{title}</span></h1>
            <p className="mt-2 text-muted">{subtitle}</p>
            <div className="mt-8">{children}</div>
          </div>
        </div>
        <p className="mt-6 text-sm text-muted">{footer}</p>
      </main>
    </>
  );
}
