"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { countWords, EE_PARTS, EE_TASK3_CONSIGNE, EE_TASK_RANGE, type EESujet } from "@/lib/ee";
import { saveEE, submitEE } from "../actions";

const ACCENTS = ["à", "â", "ç", "é", "è", "ê", "ë", "î", "ï", "ô", "ù", "û", "ü", "œ", "æ", "«", "»", "’"];
const fmt = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};
// Ruled paper, like the answer sheet.
const LINED = {
  backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, var(--line) 31px, var(--line) 32px)",
  lineHeight: "32px",
  backgroundAttachment: "local",
} as const;

function WordCount({ n, min, max, label = "Nombre de mots" }: { n: number; min: number; max: number; label?: string }) {
  const tone = n === 0 ? "text-muted" : n < min || n > max ? "text-ko" : "text-ok";
  return (
    <p className="flex items-center justify-between text-sm">
      <span className={tone}>
        {label} : <b className="tabular-nums">{n}</b>
      </span>
      <span className="text-xs text-muted">
        {min} minimum · {max} maximum
      </span>
    </p>
  );
}

export function Writer({ attemptId, deadline, sujets, initial }: { attemptId: string; deadline: number; sujets: EESujet[]; initial: string[] }) {
  const storageKey = `ee:${attemptId}`;
  const [answers, setAnswers] = useState<string[]>(initial);
  const [task, setTask] = useState(0);
  const [left, setLeft] = useState(() => deadline - Date.now());
  const [saved, setSaved] = useState<"saved" | "saving" | "offline">("saved");
  const [confirm, setConfirm] = useState(false);
  const [upper, setUpper] = useState(false);
  const [submitting, startSubmit] = useTransition();
  const boxes = useRef<(HTMLTextAreaElement | null)[]>([]);
  const lastBox = useRef(0);
  const dirty = useRef(false);
  const latest = useRef(answers);
  const handedIn = useRef(false);

  // Restore the local copy if it is ahead of the server (e.g. the last autosave didn't make it).
  useEffect(() => {
    try {
      const local = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      if (Array.isArray(local) && local.join("").length > initial.join("").length) {
        latest.current = local;
        dirty.current = true;
        setAnswers(local); // eslint-disable-line react-hooks/set-state-in-effect -- one-off restore after mount
      }
    } catch {}
  }, [storageKey, initial]);

  function update(i: number, value: string) {
    const next = answers.map((a, j) => (j === i ? value : a));
    latest.current = next;
    dirty.current = true;
    setAnswers(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }

  async function save() {
    if (!dirty.current || handedIn.current) return;
    dirty.current = false;
    setSaved("saving");
    try {
      const r = await saveEE(attemptId, latest.current);
      setSaved(r.ok ? "saved" : "offline");
    } catch {
      dirty.current = true;
      setSaved("offline");
    }
  }

  function handIn() {
    handedIn.current = true;
    startSubmit(async () => {
      await submitEE(attemptId, latest.current);
      try {
        localStorage.removeItem(storageKey);
      } catch {}
    });
  }

  // Autosave every 15 s and when the tab is hidden.
  useEffect(() => {
    const id = setInterval(save, 15_000);
    const onHide = () => document.visibilityState === "hidden" && save();
    document.addEventListener("visibilitychange", onHide);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onHide);
    };
  });

  // The clock: the copy is handed in automatically when the hour is up.
  useEffect(() => {
    const id = setInterval(() => {
      const ms = deadline - Date.now();
      setLeft(ms);
      if (ms <= 0 && !handedIn.current) {
        clearInterval(id);
        handIn();
      }
    }, 500);
    return () => clearInterval(id);
  });

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty.current && !handedIn.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  function typeAccent(ch: string) {
    const i = lastBox.current;
    const el = boxes.current[i];
    if (!el) return;
    const c = upper ? ch.toUpperCase() : ch;
    const insert = c === "«" ? "« " : c === "»" ? " »" : c;
    const { selectionStart: s, selectionEnd: e, value } = el;
    update(i, value.slice(0, s) + insert + value.slice(e));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + insert.length, s + insert.length);
    });
    if (upper) setUpper(false);
  }

  const counts = answers.map(countWords);
  const taskWords = [counts[0], counts[1], counts[2] + counts[3]];
  const s = sujets[task];
  const [tmin, tmax] = EE_TASK_RANGE[(task + 1) as 1 | 2 | 3];
  const low = left < 5 * 60_000;

  const box = (i: number, placeholder: string, rows = 12) => (
    <textarea
      ref={(el) => {
        boxes.current[i] = el;
      }}
      value={answers[i]}
      onChange={(e) => update(i, e.target.value)}
      onFocus={() => (lastBox.current = i)}
      onBlur={save}
      rows={rows}
      placeholder={placeholder}
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="sentences"
      autoComplete="off"
      disabled={submitting}
      className="w-full resize-y bg-transparent px-4 pb-2 pt-[3px] outline-none placeholder:text-muted/60"
      style={LINED}
    />
  );

  return (
    <>
      {/* Top bar: tasks, clock, hand in */}
      <div className="glass sticky top-3 z-40 flex flex-wrap items-center gap-3 rounded-3xl px-4 py-3">
        <div className="flex gap-2">
          {sujets.map((_, i) => {
            const [min, max] = EE_TASK_RANGE[(i + 1) as 1 | 2 | 3];
            const ok = taskWords[i] >= min && taskWords[i] <= max;
            return (
              <button
                key={i}
                onClick={() => setTask(i)}
                className={`rounded-full border px-4 py-1.5 text-sm ${i === task ? "border-accent bg-well" : "border-line text-muted hover:text-fg"}`}
              >
                Tâche {i + 1}
                <span className={`ml-2 text-xs tabular-nums ${taskWords[i] === 0 ? "text-muted" : ok ? "text-ok" : "text-ko"}`}>{taskWords[i]}</span>
              </button>
            );
          })}
        </div>
        <span className="ml-auto text-xs text-muted">{saved === "saving" ? "Saving…" : saved === "offline" ? "Saved on this device" : "Saved"}</span>
        <span className={`text-2xl font-bold tabular-nums ${low ? "text-ko" : ""}`}>{fmt(left)}</span>
        <button className="btn btn-primary" disabled={submitting} onClick={() => setConfirm(true)}>
          {submitting ? "Handing in…" : "Hand in"}
        </button>
      </div>

      {confirm && !submitting && (
        <div className="glass grain mt-4 rounded-3xl p-6">
          <p className="text-lg">Hand in your copy?</p>
          <p className="mt-1 text-sm text-muted">You won&apos;t be able to change it afterwards. Before handing in, reread your texts.</p>
          <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
            {EE_PARTS.map((p, i) => {
              const n = counts[i];
              const ok = n >= p.min && n <= p.max;
              return (
                <li key={p.label} className={`rounded-2xl border px-3 py-2 ${ok ? "border-ok-line" : "border-ko-line"}`}>
                  <p className="text-xs text-muted">{p.label}</p>
                  <p className={ok ? "text-ok" : "text-ko"}>
                    {n} mots <span className="text-xs text-muted">({p.min}–{p.max})</span>
                  </p>
                </li>
              );
            })}
          </ul>
          <div className="mt-5 flex gap-3">
            <button className="btn btn-primary" onClick={handIn}>Yes, hand in</button>
            <button className="btn btn-glass" onClick={() => setConfirm(false)}>Keep writing</button>
          </div>
        </div>
      )}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        {/* The sujet */}
        <section className="glass grain rounded-3xl p-7">
          <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
            <h2 className="text-2xl font-bold">TÂCHE {task + 1}</h2>
            <p className="text-right text-xs text-muted">
              {tmin} mots minimum
              <br />
              {tmax} mots maximum
            </p>
          </div>
          <p className="mt-4 leading-relaxed">{s.prompt}</p>
          {task === 2 && <p className="mt-3 text-sm leading-relaxed text-fg/80">{EE_TASK3_CONSIGNE}</p>}

          {s.documents.map((d, i) =>
            d.from ? (
              <div key={i} className="mt-5 overflow-hidden rounded-2xl border border-line bg-well text-sm">
                <p className="border-b border-line px-4 py-2"><span className="text-muted">De :</span> {d.from}</p>
                <p className="border-b border-line px-4 py-2"><span className="text-muted">Objet :</span> {d.subject}</p>
                <p className="whitespace-pre-line px-4 py-3 leading-relaxed">{d.text}</p>
              </div>
            ) : (
              <div key={i} className="mt-6">
                <h3 className="text-xl font-bold">{d.title}</h3>
                <p className="mt-2 whitespace-pre-line rounded-2xl bg-well px-5 py-4 text-sm leading-relaxed">{d.text}</p>
                {d.source && <p className="mt-1 text-xs italic text-muted">{d.source}</p>}
              </div>
            ),
          )}
        </section>

        {/* The answer sheet */}
        <section className="flex flex-col gap-3">
          <div className="glass grain overflow-hidden rounded-3xl">
            {s.sheet.kind === "email" ? (
              <div className="border-b border-line text-sm">
                <div className="flex gap-2 border-b border-line bg-well px-4 py-2 text-xs text-muted">
                  <span className="rounded-md border border-line px-2 py-0.5">Envoyer</span>
                  <span className="rounded-md border border-line px-2 py-0.5">Enregistrer</span>
                </div>
                <p className="border-b border-line px-4 py-2"><span className="text-muted">À :</span> {s.sheet.to}</p>
                <p className="px-4 py-2"><span className="text-muted">Objet :</span> {s.sheet.subject}</p>
              </div>
            ) : (
              <p className={`border-b border-line px-4 py-3 ${s.sheet.kind === "form" ? "text-center text-lg font-bold" : "text-sm text-muted"}`}>
                {s.sheet.title}
              </p>
            )}
            {task < 2 ? (
              <div className="pt-2">{box(task, "Écrivez votre texte ici…", 14)}</div>
            ) : (
              <>
                <p className="px-4 pt-3 text-xs text-muted">Partie 1 : présentez les deux opinions avec vos propres mots</p>
                {box(2, "Première partie…", 5)}
                <div className="px-4 pb-2"><WordCount n={counts[2]} min={EE_PARTS[2].min} max={EE_PARTS[2].max} label="Partie 1" /></div>
                <p className="border-t border-line px-4 pt-3 text-xs text-muted">Partie 2 : donnez votre position sur le thème général</p>
                {box(3, "Deuxième partie…", 8)}
                <div className="px-4 pb-2"><WordCount n={counts[3]} min={EE_PARTS[3].min} max={EE_PARTS[3].max} label="Partie 2" /></div>
              </>
            )}
          </div>

          <div className="px-2">
            <WordCount n={taskWords[task]} min={tmin} max={tmax} />
          </div>

          {/* French keyboard: keeps focus in the text box */}
          <div className="flex flex-wrap gap-1.5 px-1">
            <button
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setUpper((u) => !u)}
              className={`h-9 rounded-xl border px-3 text-sm ${upper ? "border-accent bg-well" : "border-line"}`}
              title="Capital letter"
            >
              ⇧
            </button>
            {ACCENTS.map((c) => (
              <button
                key={c}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => typeAccent(c)}
                className="h-9 min-w-9 rounded-xl border border-line px-2 text-sm hover:bg-well"
              >
                {upper ? c.toUpperCase() : c}
              </button>
            ))}
          </div>

          <div className="flex justify-between px-2 text-sm">
            {task > 0 ? <button className="text-muted hover:text-fg" onClick={() => setTask(task - 1)}>← Tâche {task}</button> : <span />}
            {task < 2 && (
              <button className="text-muted hover:text-fg" onClick={() => setTask(task + 1)}>
                Tâche {task + 2} →
              </button>
            )}
          </div>
          <p className="px-2 text-xs text-muted">1 mot = tout ensemble de signes entre deux espaces (« c&apos;est-à-dire » = 1 mot).</p>
        </section>
      </div>
    </>
  );
}
