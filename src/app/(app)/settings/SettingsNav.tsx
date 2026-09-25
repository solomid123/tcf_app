"use client";

import { useEffect, useRef, useState } from "react";

type Item = { id: string; label: string };

export function SettingsNav({ items }: { items: Item[] }) {
  const [active, setActive] = useState(items[0]?.id);
  // After a click, keep the clicked item highlighted until the user scrolls by hand —
  // short sections near the bottom can't reach the top, so position alone would pick the wrong one.
  const locked = useRef(false);

  useEffect(() => {
    const update = () => {
      if (locked.current) return;
      const atBottom =
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) return setActive(items[items.length - 1].id);
      let current = items[0].id;
      for (const i of items) {
        const el = document.getElementById(i.id);
        if (el && el.getBoundingClientRect().top <= 140) current = i.id;
      }
      setActive(current);
    };
    const unlock = () => {
      locked.current = false;
    };
    const unlockOnKey = (e: KeyboardEvent) => {
      if (["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " "].includes(e.key)) unlock();
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    window.addEventListener("wheel", unlock, { passive: true });
    window.addEventListener("touchstart", unlock, { passive: true });
    window.addEventListener("keydown", unlockOnKey);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("wheel", unlock);
      window.removeEventListener("touchstart", unlock);
      window.removeEventListener("keydown", unlockOnKey);
    };
  }, [items]);

  return (
    <nav className="glass sticky top-[8.25rem] space-y-1 rounded-3xl p-3">
      {items.map((t) => (
        <a
          key={t.id}
          href={`#${t.id}`}
          onClick={() => {
            locked.current = true;
            setActive(t.id);
          }}
          aria-current={active === t.id ? "true" : undefined}
          className={`block rounded-2xl px-4 py-2.5 text-sm transition-colors ${
            active === t.id
              ? "bg-white/10 text-fg shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
              : "text-muted hover:bg-white/5 hover:text-fg"
          }`}
        >
          {t.label}
        </a>
      ))}
    </nav>
  );
}
