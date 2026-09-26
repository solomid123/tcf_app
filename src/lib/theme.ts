// Theme preference lives in localStorage (per device). "system" follows the OS setting.
export type ThemePref = "dark" | "light" | "system";
export type Theme = "dark" | "light";

const KEY = "theme";
const LIGHT_QUERY = "(prefers-color-scheme: light)";
const listeners = new Set<() => void>();

// Runs inline in <head> before first paint so the page never flashes the wrong theme.
export const themeScript = `(function(){try{var p=localStorage.getItem("${KEY}");var t=p==="light"||p==="dark"?p:p==="system"&&matchMedia("${LIGHT_QUERY}").matches?"light":"dark";document.documentElement.dataset.theme=t}catch(e){}})()`;

export function getPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "system" ? v : "dark";
  } catch {
    return "dark";
  }
}

export function resolveTheme(pref: ThemePref): Theme {
  if (pref !== "system") return pref;
  return window.matchMedia(LIGHT_QUERY).matches ? "light" : "dark";
}

function apply() {
  document.documentElement.dataset.theme = resolveTheme(getPref());
}

export function setPref(pref: ThemePref) {
  try {
    localStorage.setItem(KEY, pref);
  } catch {}
  apply();
  listeners.forEach((l) => l());
}

export function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia(LIGHT_QUERY);
  const onChange = () => {
    apply();
    cb();
  };
  mq.addEventListener("change", onChange);
  window.addEventListener("storage", onChange); // keep other tabs in sync
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}
