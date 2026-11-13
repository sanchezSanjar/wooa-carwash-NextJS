"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { KO } from "./ko";
import * as f from "./format";

export type Lang = "ko" | "en";
export const LANG_COOKIE = "wooa_lang";

type Params = Record<string, string | number>;

/** English text is the key; Korean comes from KO (missing ones show the English). {name} is filled from params. */
export function translate(lang: Lang, text: string, params?: Params) {
  let out = lang === "ko" ? (KO[text] ?? text) : text;
  if (params) for (const [k, v] of Object.entries(params)) out = out.replaceAll(`{${k}}`, String(v));
  return out;
}

function makeFmt(lang: Lang) {
  return {
    day: (date: string) => f.dayLabel(date, lang),
    dayLong: (date: string) => f.dayLong(date, lang),
    month: (month: string) => f.monthLabel(month, lang),
    krw: (n: number) => f.krw(n, lang),
    phone: f.phone,
    dateTime: (iso: string) => f.dateTime(iso, lang),
    schedule: (s: { weekday: number; weeks: number[] }[]) => f.scheduleText(s, lang),
    /** A plan or extra name: the built-in ones in Korean, names admins typed stay as typed. */
    name: (n: string) => translate(lang, n),
  };
}

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (text: string, params?: Params) => string;
  /** Picks the singular or plural English text for n. */
  tn: (n: number, one: string, many: string) => string;
  fmt: ReturnType<typeof makeFmt>;
}

const Ctx = createContext<I18n | null>(null);

export function I18nProvider({ initial, children }: { initial: Lang; children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initial);
  const setLang = useCallback((next: Lang) => {
    // read by the server too: API errors and Excel files come in this language
    document.cookie = `${LANG_COOKIE}=${next}; path=/; max-age=31536000; samesite=strict`;
    document.documentElement.lang = next;
    setLangState(next);
  }, []);
  const value = useMemo<I18n>(
    () => ({
      lang,
      setLang,
      t: (text, params) => translate(lang, text, params),
      tn: (n, one, many) => translate(lang, n === 1 ? one : many, { n }),
      fmt: makeFmt(lang),
    }),
    [lang, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
