import Link from "next/link";
import { Bullets } from "@/components/Bullets";
import { faqs, nclc, skills } from "./data";

export function Skills() {
  return (
    <section id="skills" className="scroll-mt-28 py-28">
      <p className="eyebrow">The four épreuves</p>
      <h2 className="mt-3 max-w-2xl text-4xl md:text-5xl">
        Every section of the exam, <span className="text-muted">exactly as you will sit it.</span>
      </h2>
      <div className="mt-14 grid gap-5 sm:grid-cols-2">
        {skills.map((s) => (
          <article key={s.code} className="glass grain rounded-3xl p-7 transition-transform duration-300 hover:-translate-y-1">
            <div className="flex items-start justify-between">
              <span className="text-chrome text-5xl font-bold">{s.code}</span>
              <div className="flex gap-2 text-xs text-muted">
                <span className="rounded-full border border-line px-3 py-1">{s.q}</span>
                <span className="rounded-full border border-line px-3 py-1">{s.t}</span>
              </div>
            </div>
            <h3 className="mt-6 text-xl">{s.name}</h3>
            <p className="text-sm text-muted">{s.en}</p>
            <p className="mt-4 leading-relaxed text-fg/75">{s.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

const practice = ["Drill one skill or one CEFR level at a time", "No timer pressure, instant corrections", "Explanations for every answer", "Track weak spots over time"];
const exam = ["Full-length, strictly timed sessions", "Official question count and difficulty curve", "No going back once time runs out", "Estimated TCF score and NCLC at the end"];

export function Modes() {
  return (
    <section id="exams" className="scroll-mt-28 pb-28">
      <div className="glass grain grid overflow-hidden rounded-[2rem] md:grid-cols-2">
        {[
          { n: "01", title: "Practice", items: practice },
          { n: "02", title: "Exam sitting", items: exam },
        ].map((m, i) => (
          <div key={m.n} className={`p-10 ${i === 0 ? "border-b border-line md:border-b-0 md:border-r" : ""}`}>
            <p className="eyebrow">Mode {m.n}</p>
            <h3 className="mt-3 text-3xl">{m.title}</h3>
            <Bullets items={m.items} className="mt-6 space-y-3 text-fg/75" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function Scoring() {
  return (
    <section id="scoring" className="scroll-mt-28 pb-28">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <div>
          <p className="eyebrow">Know where you stand</p>
          <h2 className="mt-3 text-4xl md:text-5xl">From raw score <span className="text-muted">to NCLC.</span></h2>
          <p className="mt-6 max-w-md leading-relaxed text-muted">
            Every attempt is converted to the TCF scale and mapped to Canadian Language
            Benchmarks, so you always know how close you are to your Express Entry target.
          </p>
        </div>
        <div className="glass grain space-y-5 rounded-3xl p-8">
          {nclc.map((n) => (
            <div key={n.level}>
              <div className="mb-2 flex justify-between text-sm">
                <span>{n.level}</span>
                <span className="text-muted">{n.label}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-tint">
                <div className="h-full rounded-full bg-gradient-to-r from-fg/30 via-fg/70 to-accent" style={{ width: n.w }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Faq() {
  return (
    <section id="faq" className="scroll-mt-28 pb-28">
      <p className="eyebrow">FAQ</p>
      <h2 className="mt-3 text-4xl">Questions fréquentes</h2>
      <div className="mt-10 space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="glass group rounded-2xl px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between text-lg">
              {f.q}
              <span className="text-muted transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-4 leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function Cta() {
  return (
    <section className="pb-24">
      <div className="glass-strong grain rounded-[2rem] px-8 py-16 text-center">
        <h2 className="text-4xl md:text-5xl"><span className="text-chrome">Prêt à commencer ?</span></h2>
        <p className="mx-auto mt-4 max-w-md text-muted">Create a free account and take your first mock exam in minutes.</p>
        <Link href="/signup" className="btn btn-primary mt-8">Create free account</Link>
      </div>
    </section>
  );
}

export function Footer() {
  return (
    <footer className="mx-auto w-full max-w-6xl px-4 pb-10 text-sm text-muted">
      <div className="flex flex-col justify-between gap-2 border-t border-line pt-6 md:flex-row">
        <span>© {new Date().getFullYear()} TCF Prep. Not affiliated with France Éducation international.</span>
        <span>Made for future Canadians</span>
      </div>
    </footer>
  );
}
