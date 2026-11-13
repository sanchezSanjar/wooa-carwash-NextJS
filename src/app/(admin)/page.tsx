"use client";

import Link from "next/link";
import { Stars, WashBadge } from "@/components/status";
import { Badge, Banner, Card, Empty, PageHeader, Spinner, Stat, Table } from "@/components/ui";
import { api } from "@/lib/api";
import { addDays, today } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import { useLoad } from "@/lib/use-load";

const ROUTE_ROWS = 8;
const LOW_RATING = 3;

/** The admin's first page: today's washes, money, plans, and what needs a look. */
export default function OverviewPage() {
  const { t, tn, fmt } = useI18n();
  const day = today();
  const month = day.slice(0, 7);

  const { data, error, loading } = useLoad(async () => {
    const [sheet, tomorrow, bills, overdue, plans, members, reviews] = await Promise.all([
      api.daySheet(day),
      api.daySheet(addDays(day, 1)),
      api.invoices(month),
      api.overdueInvoices(),
      api.subscriptions(),
      api.members(),
      api.reviews(),
    ]);
    return { sheet, tomorrow, bills, overdue, plans, members, reviews };
  }, `${day}`);

  if (loading && !data) return <Spinner />;
  if (error || !data) return <Banner>{error}</Banner>;

  const { sheet, tomorrow, bills, overdue, plans, members, reviews } = data;
  const done = sheet.rows.filter((r) => r.status !== "planned").length;
  const weekAgo = addDays(day, -7);
  const newPlans = plans.filter((p) => p.startDate > weekAgo && p.startDate <= day).length;
  const overdueTotal = overdue.reduce((sum, b) => sum + b.amount, 0);
  const oldestOverdue = overdue.reduce((min, b) => (b.dueDate < min ? b.dueDate : min), day);
  const overdueDays = Math.round((Date.parse(day) - Date.parse(oldestOverdue)) / 86_400_000);
  const noPassword = members.filter((m) => m.hasPassword === false && m.status === "active");
  const lowReviews = reviews.filter((r) => r.review && r.review.rating <= LOW_RATING && r.date >= addDays(day, -14));

  const attention: { tone: "bad" | "warn" | "info"; title: string; sub: string; href: string }[] = [];
  if (overdue.length) {
    attention.push({
      tone: "bad",
      title: tn(overdue.length, "{n} overdue bill", "{n} overdue bills"),
      sub: t("{amount} · oldest {days} days late", { amount: fmt.krw(overdueTotal), days: overdueDays }),
      href: "/payments?filter=overdue",
    });
  }
  if (tomorrow.weather?.wet) {
    attention.push({
      tone: "warn",
      title: t("Rain likely tomorrow ({pop}%)", { pop: tomorrow.weather.pop }),
      sub: tn(tomorrow.rows.length, "{n} car on tomorrow's sheet", "{n} cars on tomorrow's sheet"),
      href: `/day-sheet?date=${addDays(day, 1)}`,
    });
  }
  if (noPassword.length) {
    attention.push({
      tone: "info",
      title: tn(noPassword.length, "{n} member hasn't set a password", "{n} members haven't set a password"),
      sub: t("They were invited by SMS"),
      href: "/members",
    });
  }
  for (const r of lowReviews.slice(0, 3)) {
    attention.push({
      tone: "warn",
      title: t("{stars}-star review", { stars: r.review!.rating }),
      sub: `${r.plateNumber} · ${r.review!.comment || fmt.day(r.date)}`,
      href: "/reviews",
    });
  }

  return (
    <>
      <PageHeader
        title={fmt.dayLong(day)}
        sub={sheet.weather ? `${t("Today")}: ${t("{pop}% chance of rain", { pop: sheet.weather.pop })}` : t("Overview")}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat
          label={t("Washes today")}
          value={`${done} / ${sheet.rows.length}`}
          sub={sheet.rows.length - done ? tn(sheet.rows.length - done, "{n} still to do", "{n} still to do") : t("All done")}
          tone={sheet.rows.length && done === sheet.rows.length ? "ok" : undefined}
        />
        <Stat
          label={t("Unpaid in {month}", { month: fmt.month(month) })}
          value={fmt.krw(bills.totals.unpaid)}
          sub={tn(bills.totals.unpaidCount, "{n} bill", "{n} bills")}
        />
        <Stat label={t("Overdue")} value={overdue.length} sub={fmt.krw(overdueTotal)} tone={overdue.length ? "bad" : undefined} />
        <Stat label={t("Active plans")} value={plans.length} sub={t("+{n} this week", { n: newPlans })} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card
          title={t("Today's route")}
          action={
            <Link href="/day-sheet" className="text-[13px] text-info hover:underline">
              {t("Open day sheet")} →
            </Link>
          }
        >
          {sheet.rows.length === 0 ? (
            <Empty title={t("No washes today")} />
          ) : (
            <>
              <Table head={[t("Building · floor"), t("Car"), t("Member"), t("Washer"), t("Status")]}>
                {sheet.rows.slice(0, ROUTE_ROWS).map((r) => (
                  <tr key={`${r.subscriptionId}-${r.scheduledDate}`}>
                    <td className="whitespace-nowrap">
                      {r.car.buildingNumber} · {r.car.parkingFloor}
                    </td>
                    <td className="font-medium whitespace-nowrap">{r.car.plateNumber}</td>
                    <td className="text-ink-2 whitespace-nowrap">{r.member.name}</td>
                    <td className="text-ink-2 whitespace-nowrap">{r.washerName ?? "—"}</td>
                    <td>
                      <WashBadge status={r.status} />
                    </td>
                  </tr>
                ))}
              </Table>
              {sheet.rows.length > ROUTE_ROWS ? (
                <p className="border-t border-line px-4 py-2 text-[13px] text-ink-3">{t("+{n} more on the day sheet", { n: sheet.rows.length - ROUTE_ROWS })}</p>
              ) : null}
            </>
          )}
        </Card>

        <Card title={t("Needs attention")}>
          {attention.length === 0 ? (
            <Empty title={t("All clear")}>{t("No overdue bills, warnings or low ratings.")}</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((a, i) => (
                <li key={i}>
                  <Link href={a.href} className="flex items-start gap-3 px-4 py-3 hover:bg-soft">
                    <Badge tone={a.tone}>{a.tone === "bad" ? "!" : a.tone === "warn" ? "•" : "i"}</Badge>
                    <span className="min-w-0">
                      <span className="block font-medium">{a.title}</span>
                      <span className="block truncate text-[13px] text-ink-2">{a.sub}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {reviews.length ? (
        <Card title={t("Latest reviews")} className="mt-5" action={<Link href="/reviews" className="text-[13px] text-info hover:underline">{t("All reviews")} →</Link>}>
          <ul className="divide-y divide-line">
            {reviews.slice(0, 3).map((r) => (
              <li key={`${r.subscriptionId}-${r.date}`} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <span className="min-w-0">
                  <span className="font-medium">{r.plateNumber}</span>
                  <span className="text-ink-2"> · {r.memberName} · {fmt.day(r.date)}</span>
                  {r.review?.comment ? <span className="block truncate text-[13px] text-ink-2">{r.review.comment}</span> : null}
                </span>
                {r.review ? <Stars rating={r.review.rating} /> : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
