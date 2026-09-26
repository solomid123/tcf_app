import Link from "next/link";
import { TrafficLights } from "@/components/TrafficLights";
import { sampleOptions } from "./data";

export function Hero() {
  return (
    <section className="pt-16 md:pt-24">
      <div className="glass grain animate-fade-up overflow-hidden rounded-[2rem]">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <TrafficLights />
          <span className="text-sm text-muted">tcfprep.ca/exam</span>
          <span className="w-[52px]" />
        </div>

        <div className="grid gap-12 px-6 py-14 md:grid-cols-[1.2fr_1fr] md:px-14 md:py-20">
          <div>
            <p className="eyebrow mb-6">TCF Canada · Préparation</p>
            <h1 className="text-5xl leading-[1.05] md:text-7xl">
              <span className="text-chrome font-bold">Réussir</span>
              <br />
              <span className="font-bold text-fg/45">votre TCF.</span>
            </h1>
            <p className="mt-8 max-w-md text-lg leading-relaxed text-muted">
              Realistic timed mock exams and targeted practice for all four skills — built to
              get you the NCLC score your immigration file needs.
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <Link href="/signup" className="btn btn-primary">Start practising free →</Link>
              <Link href="#exams" className="btn btn-glass">See how exams work</Link>
            </div>
            <div className="mt-12 flex items-center gap-3">
              {["4 SKILLS", "NCLC", "TIMED"].map((b) => (
                <span key={b} className="rounded-md border border-fg/40 px-2 py-1 text-[11px] tracking-[0.2em] text-fg/80">
                  {b}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-strong grain relative self-center rounded-3xl p-6">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Compréhension écrite</span>
              <span className="rounded-full bg-tint px-3 py-1 text-xs tabular-nums">42:18</span>
            </div>
            <p className="mt-5 text-sm text-muted">Question 17 / 39 · Niveau B2</p>
            <p className="mt-2 leading-relaxed">
              D’après le document, pourquoi la mairie a-t-elle décidé de fermer la bibliothèque
              le samedi ?
            </p>
            <div className="mt-5 space-y-2.5">
              {sampleOptions.map((o, i) => {
                const active = i === 1;
                return (
                  <div
                    key={o}
                    className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm ${active ? "border-accent/60 bg-accent/10" : "border-line bg-well"}`}
                  >
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${active ? "bg-accent text-black" : "bg-tint"}`}>
                      {"ABCD"[i]}
                    </span>
                    {o}
                  </div>
                );
              })}
            </div>
            <div className="mt-6 h-1.5 overflow-hidden rounded-full bg-tint">
              <div className="h-full w-[44%] rounded-full bg-gradient-to-r from-fg/60 to-accent" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
