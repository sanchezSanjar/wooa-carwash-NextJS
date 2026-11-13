"use client";

import { useState } from "react";
import { WashModal } from "@/components/day-sheet/wash";
import { Stars } from "@/components/status";
import { Banner, Card, Empty, PageHeader, Select, Spinner, Stat, Table } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import { useLoad } from "@/lib/use-load";

/** Members' ratings of finished washes, newest first. Click one to see the wash and its photos. */
export default function ReviewsPage() {
  const { t, tn, fmt } = useI18n();
  const [filter, setFilter] = useState<"all" | "low" | "comments">("all");
  const [open, setOpen] = useState<{ subscriptionId: string; date: string } | null>(null);
  const { data, error, loading } = useLoad(() => api.reviews(), "reviews");

  if (loading && !data) return <Spinner />;
  if (!data) return <Banner>{error}</Banner>;

  const rated = data.filter((r) => r.review);
  const avg = rated.length ? rated.reduce((s, r) => s + r.review!.rating, 0) / rated.length : 0;
  const low = rated.filter((r) => r.review!.rating <= 3).length;
  const list = rated.filter((r) => (filter === "low" ? r.review!.rating <= 3 : filter === "comments" ? !!r.review!.comment : true));

  return (
    <>
      <PageHeader title={t("Reviews")} sub={t("Members can rate each finished wash.")} />
      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
        <Stat label={t("Average rating")} value={rated.length ? avg.toFixed(1) : "—"} sub={tn(rated.length, "{n} rating", "{n} ratings")} />
        <Stat label={t("3 stars or less")} value={low} tone={low ? "bad" : undefined} />
        <Stat label={t("With a comment")} value={rated.filter((r) => r.review!.comment).length} />
      </div>
      <Card>
        <div className="flex items-center gap-2 border-b border-line px-4 py-3">
          <Select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} className="h-8 text-[13px]" aria-label={t("Show")}>
            <option value="all">{t("All ratings")}</option>
            <option value="low">{t("3 stars or less")}</option>
            <option value="comments">{t("With a comment")}</option>
          </Select>
        </div>
        {list.length === 0 ? (
          <Empty title={t("No ratings yet")} />
        ) : (
          <Table head={[t("Rating"), t("Comment"), t("Car"), t("Member"), t("Wash")]}>
            {list.map((r) => (
              <tr key={`${r.subscriptionId}-${r.date}`} onClick={() => setOpen(r)} className="cursor-pointer hover:bg-soft">
                <td className="whitespace-nowrap">
                  <Stars rating={r.review!.rating} />
                </td>
                <td className="max-w-md">{r.review!.comment || <span className="text-ink-3">—</span>}</td>
                <td className="font-medium whitespace-nowrap">{r.plateNumber}</td>
                <td>
                  {r.memberName}
                  <span className="block text-xs text-ink-3">{r.apartmentName}</span>
                </td>
                <td className="whitespace-nowrap">{fmt.day(r.date)}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {open ? <WashModal subscriptionId={open.subscriptionId} date={open.date} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
