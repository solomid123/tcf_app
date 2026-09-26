"use client";

import { useSyncExternalStore } from "react";
import { getPref, resolveTheme, setPref, subscribe, type ThemePref } from "@/lib/theme";

export function useTheme() {
  const pref = useSyncExternalStore<ThemePref>(subscribe, getPref, () => "dark");
  const theme = useSyncExternalStore(subscribe, () => resolveTheme(getPref()), () => "dark" as const);
  return { pref, theme, setPref };
}
