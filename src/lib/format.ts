import type { Lang } from "./i18n";

const TZ = "Asia/Seoul";
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

/** Today in Korea, YYYY-MM-DD (the shop's day, wherever the admin is). */
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 7);
}

const parts = (date: string) => {
  const d = new Date(`${date}T00:00:00Z`);
  return { d, m: d.getUTCMonth() + 1, day: d.getUTCDate(), wd: d.getUTCDay() };
};

/** 11월 12일 (목) / Thu 12 Nov */
export function dayLabel(date: string, lang: Lang): string {
  const { d, m, day, wd } = parts(date);
  if (lang === "ko") return `${m}월 ${day}일 (${WEEKDAY_KO[wd]})`;
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
}

/** 11월 12일 목요일 / Thursday, 12 November */
export function dayLong(date: string, lang: Lang): string {
  const { d, m, day, wd } = parts(date);
  if (lang === "ko") return `${m}월 ${day}일 ${WEEKDAY_KO[wd]}요일`;
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
}

/** 2026년 11월 / November 2026 */
export function monthLabel(month: string, lang: Lang): string {
  const [y, m] = month.split("-").map(Number);
  if (lang === "ko") return `${y}년 ${m}월`;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** 40,000원 / ₩40,000 */
export function krw(n: number, lang: Lang): string {
  const s = Math.round(n).toLocaleString("en-US");
  return lang === "ko" ? `${s}원` : `₩${s}`;
}

/** 01012345678 → 010-1234-5678 */
export function phone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
  return digits;
}

export function dateTime(iso: string, lang: Lang): string {
  return new Date(iso).toLocaleString(lang === "ko" ? "ko-KR" : "en-GB", { timeZone: TZ, dateStyle: "medium", timeStyle: "short" });
}

const WEEKDAY_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const ORDINAL_KO = ["", "첫째", "둘째", "셋째", "넷째"];
const ORDINAL_EN = ["", "1st", "2nd", "3rd", "4th"];

/** Wash days of a plan: "Thu, every week" / "목요일 매주", "Mon 1st and 3rd" / "첫째·셋째 주 월요일". */
export function scheduleText(schedule: { weekday: number; weeks: number[] }[], lang: Lang): string {
  return schedule
    .map(({ weekday, weeks }) => {
      const every = weeks.length >= 4;
      if (lang === "ko") return every ? `매주 ${WEEKDAY_KO[weekday]}요일` : `${weeks.map((w) => ORDINAL_KO[w]).join("·")} 주 ${WEEKDAY_KO[weekday]}요일`;
      return every ? `${WEEKDAY_EN[weekday]}, every week` : `${WEEKDAY_EN[weekday]} ${weeks.map((w) => ORDINAL_EN[w]).join(" and ")}`;
    })
    .join(lang === "ko" ? ", " : "; ");
}
