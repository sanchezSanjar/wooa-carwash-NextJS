"use client";

import { useI18n } from "@/lib/i18n";
import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
const BUTTON: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent hover:opacity-90",
  secondary: "bg-surface text-ink border border-line hover:bg-soft",
  ghost: "text-ink-2 hover:bg-soft hover:text-ink",
  danger: "bg-surface text-bad border border-line hover:bg-bad-soft",
};

export function Button({
  variant = "secondary",
  size = "md",
  busy,
  className,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: "sm" | "md"; busy?: boolean }) {
  return (
    <button
      {...rest}
      disabled={rest.disabled || busy}
      className={cx(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium whitespace-nowrap transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer",
        size === "sm" ? "h-8 px-3 text-[13px]" : "h-9 px-4",
        BUTTON[variant],
        className,
      )}
    >
      {busy ? <span className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden /> : null}
      {children}
    </button>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...rest}
      className={cx("h-9 w-full rounded-lg border border-line bg-surface px-3 text-ink placeholder:text-ink-3 outline-none focus:border-ink-2", className)}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select {...rest} className={cx("h-9 rounded-lg border border-line bg-surface px-2 text-ink outline-none focus:border-ink-2", className)}>
      {children}
    </select>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[13px] text-ink-2">{label}</span>
      {children}
      {hint ? <span className="text-xs text-ink-3">{hint}</span> : null}
    </label>
  );
}

export function Card({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-xl border border-line bg-surface", className)}>
      {title || action ? (
        <header className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          {action}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "bad" | "ok" }) {
  return (
    <div className="rounded-xl border border-line bg-surface px-4 py-3">
      <p className="text-[13px] text-ink-2">{label}</p>
      <p className={cx("mt-1 text-2xl font-semibold tabular-nums", tone === "bad" && "text-bad", tone === "ok" && "text-ok")}>{value}</p>
      {sub ? <p className="mt-0.5 text-xs text-ink-3">{sub}</p> : null}
    </div>
  );
}

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";
const BADGE: Record<Tone, string> = {
  ok: "bg-ok-soft text-ok",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
  info: "bg-info-soft text-info",
  neutral: "bg-soft text-ink-2",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={cx("inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap", BADGE[tone])}>{children}</span>;
}

export function Banner({ tone = "bad", children }: { tone?: Tone; children: ReactNode }) {
  return <div className={cx("rounded-lg px-3 py-2 text-[13px]", BADGE[tone])}>{children}</div>;
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-2 p-6 text-ink-2" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-ink-3 border-r-transparent" aria-hidden />
      {label ?? t("Loading…")}
    </div>
  );
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      <p className="font-medium">{title}</p>
      {children ? <p className="mt-1 text-[13px] text-ink-2">{children}</p> : null}
    </div>
  );
}

/** Page title row: title, a line under it, and actions on the right. */
export function PageHeader({ title, sub, actions }: { title: string; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {sub ? <p className="mt-0.5 text-ink-2">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

/** A plain table: header cells get the muted style. */
export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-b border-line text-xs text-ink-3">
            {head.map((h, i) => (
              <th key={i} className="px-4 py-2 font-normal whitespace-nowrap">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&>tr]:border-b [&>tr]:border-line [&>tr:last-child]:border-0 [&_td]:px-4 [&_td]:py-2.5">{children}</tbody>
      </table>
    </div>
  );
}

/** A dialog drawn over the page. */
export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const { t } = useI18n();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[8vh]" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx("w-full rounded-xl border border-line bg-surface shadow-xl", wide ? "max-w-3xl" : "max-w-md")}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <button onClick={onClose} className="rounded-md px-2 text-lg text-ink-2 hover:bg-soft cursor-pointer" aria-label={t("Close")}>
            ×
          </button>
        </header>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

export { cx };
