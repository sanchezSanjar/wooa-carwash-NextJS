"use client";

import { useState } from "react";
import { PlanModal } from "@/components/plan";
import { Badge, Banner, Card, Empty, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { AdminSubscription } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

/** Every active plan: which car, whose, which days, what it costs, and when the next wash is. */
export default function PlansPage() {
  const { t, fmt } = useI18n();
  const [search, setSearch] = useState("");
  const [tariff, setTariff] = useState("");
  const [open, setOpen] = useState<AdminSubscription | null>(null);
  const { data, error, loading, reload } = useLoad(() => api.subscriptions(), "plans");

  if (loading && !data) return <Spinner />;
  if (!data) return <Banner>{error}</Banner>;

  const tariffs = [...new Set(data.map((p) => p.tariffName))].sort();
  const q = search.trim().toLowerCase();
  const list = data.filter(
    (p) =>
      (!tariff || p.tariffName === tariff) &&
      (!q || [p.car?.plateNumber, p.member?.name, p.member?.phone, p.member?.apartmentName, p.car?.buildingNumber].some((v) => v?.toLowerCase().includes(q))),
  );
  const monthly = list.reduce((s, p) => s + p.monthlyPrice, 0);

  return (
    <>
      <PageHeader title={t("Cars and plans")} sub={t("{n} active plans · {amount} a month", { n: list.length, amount: fmt.krw(monthly) })} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Plate, name, phone or building")} className="h-8 !w-72" aria-label={t("Search")} />
          <Select value={tariff} onChange={(e) => setTariff(e.target.value)} className="h-8 text-[13px]" aria-label={t("Plan")}>
            <option value="">{t("All plans")}</option>
            {tariffs.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </Select>
        </div>
        {list.length === 0 ? (
          <Empty title={t("No plans found.")} />
        ) : (
          <Table head={[t("Car"), t("Member"), t("Building · floor"), t("Plan"), t("Wash days"), t("Per month"), t("Next wash")]}>
            {list.map((p) => (
              <tr key={p.id} onClick={() => setOpen(p)} className="cursor-pointer hover:bg-soft">
                <td className="whitespace-nowrap">
                  <span className="font-semibold">{p.car?.plateNumber ?? "—"}</span>
                  <span className="block text-xs text-ink-2">
                    {p.car ? `${p.car.brand} ${p.car.model} · ${t(p.car.color)}` : ""}
                  </span>
                </td>
                <td>
                  {p.member?.name ?? "—"}
                  <span className="block text-xs text-ink-3">{p.member ? fmt.phone(p.member.phone) : ""}</span>
                </td>
                <td className="whitespace-nowrap">
                  {p.car ? `${p.car.buildingNumber} · ${p.car.parkingFloor}` : "—"}
                  <span className="block text-xs text-ink-3">{p.member?.apartmentName}</span>
                </td>
                <td>
                  <Badge tone="info">{p.tariffName}</Badge>
                  {p.extras.length ? <span className="block text-xs text-ink-2">+ {p.extras.map((e) => e.name).join(", ")}</span> : null}
                </td>
                <td className="text-[13px]">{fmt.schedule(p.schedule)}</td>
                <td className="font-medium whitespace-nowrap tabular-nums">{fmt.krw(p.monthlyPrice)}</td>
                <td className="whitespace-nowrap">{p.upcoming[0] ? fmt.day(p.upcoming[0]) : "—"}</td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      {open ? (
        <PlanModal
          plan={open}
          onClose={() => setOpen(null)}
          onCancelled={() => {
            setOpen(null);
            reload();
          }}
        />
      ) : null}
    </>
  );
}
