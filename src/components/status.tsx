"use client";

import { useI18n } from "@/lib/i18n";
import type { InvoiceStatus, WashStatus } from "@/lib/types";
import { Badge } from "./ui";

export function WashBadge({ status }: { status: WashStatus }) {
  const { t } = useI18n();
  if (status === "done") return <Badge tone="ok">{t("Washed")}</Badge>;
  if (status === "skipped") return <Badge tone="warn">{t("Skipped")}</Badge>;
  return <Badge>{t("Planned")}</Badge>;
}

export function BillBadge({ status, overdue }: { status: InvoiceStatus; overdue: boolean }) {
  const { t } = useI18n();
  if (status === "paid") return <Badge tone="ok">{t("Paid")}</Badge>;
  if (status === "void") return <Badge>{t("Void")}</Badge>;
  return overdue ? <Badge tone="bad">{t("Overdue")}</Badge> : <Badge tone="warn">{t("Unpaid")}</Badge>;
}

export function Stars({ rating }: { rating: number }) {
  return (
    <span className="tracking-tight text-warn" aria-label={`${rating} / 5`}>
      {"★".repeat(rating)}
      <span className="text-ink-3">{"★".repeat(5 - rating)}</span>
    </span>
  );
}
