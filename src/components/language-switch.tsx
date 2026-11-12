"use client";

import { useRouter } from "next/navigation";
import { useI18n, type Lang } from "@/lib/i18n";
import { cx } from "./ui";

/** 한국어 / EN. Also changes the language of API errors and Excel files (sent with every request). */
export function LanguageSwitch() {
  const { lang, setLang } = useI18n();
  const router = useRouter();
  const pick = (next: Lang) => {
    setLang(next);
    router.refresh();
  };
  return (
    <div className="flex rounded-lg border border-line p-0.5 text-[13px]" role="group" aria-label="Language / 언어">
      {(["ko", "en"] as const).map((l) => (
        <button
          key={l}
          onClick={() => pick(l)}
          aria-pressed={lang === l}
          className={cx("flex-1 rounded-md px-2 py-1 cursor-pointer", lang === l ? "bg-accent text-on-accent" : "text-ink-2 hover:text-ink")}
        >
          {l === "ko" ? "한국어" : "EN"}
        </button>
      ))}
    </div>
  );
}
