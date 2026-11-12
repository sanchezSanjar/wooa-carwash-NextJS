"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { User } from "@/lib/types";
import { LanguageSwitch } from "./language-switch";
import { cx } from "./ui";

export const NAV = [
  { href: "/", label: "Overview", icon: "▦" },
  { href: "/day-sheet", label: "Day sheet", icon: "☰" },
  { href: "/payments", label: "Payments", icon: "₩" },
  { href: "/members", label: "Members", icon: "◉" },
  { href: "/plans", label: "Cars and plans", icon: "◇" },
  { href: "/prices", label: "Plans and prices", icon: "◈" },
  { href: "/reviews", label: "Reviews", icon: "★" },
] as const;

export function Sidebar() {
  const { t } = useI18n();
  const path = usePathname();
  const [me, setMe] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    api.me().then(setMe, () => undefined);
  }, []);
  const logout = async () => {
    await fetch("/api/logout", { method: "POST" }).catch(() => undefined);
    router.replace("/login");
    router.refresh();
  };

  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));

  return (
    <>
      <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 lg:hidden">
        <span className="font-semibold">우아세차</span>
        <button onClick={() => setOpen((o) => !o)} className="rounded-md border border-line px-2.5 py-1 cursor-pointer" aria-expanded={open}>
          {t("Menu")}
        </button>
      </div>
      <aside
        className={cx(
          "flex-col gap-1 border-r border-line bg-surface px-3 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:w-56 lg:shrink-0",
          open ? "flex" : "hidden",
        )}
      >
        <div className="mb-4 hidden px-2 lg:block">
          <p className="text-lg font-semibold">우아세차</p>
          <p className="text-xs text-ink-3">{t("Admin")}</p>
        </div>
        <nav className="flex flex-col gap-0.5" aria-label={t("Menu")}>
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active(item.href) ? "page" : undefined}
              onClick={() => setOpen(false)}
              className={cx(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2",
                active(item.href) ? "bg-soft font-semibold text-ink" : "text-ink-2 hover:bg-soft hover:text-ink",
              )}
            >
              <span className="w-4 text-center text-ink-3" aria-hidden>
                {item.icon}
              </span>
              {t(item.label)}
            </Link>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-3 border-t border-line px-1 pt-4">
          {me ? (
            <div className="px-1">
              <p className="truncate font-medium">{me.name}</p>
              <p className="text-xs text-ink-3">{t("Admin")}</p>
            </div>
          ) : null}
          <LanguageSwitch />
          <button onClick={logout} className="rounded-lg px-2.5 py-2 text-left text-ink-2 hover:bg-soft hover:text-ink cursor-pointer">
            {t("Log out")}
          </button>
        </div>
      </aside>
    </>
  );
}
