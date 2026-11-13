"use client";

import { useState } from "react";
import { Badge, Banner, Button, Card, Input, PageHeader, Spinner, Table } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Extra, Tariff } from "@/lib/types";
import { errorText, useLoad } from "@/lib/use-load";

/**
 * The price list. A new price applies to plans started from now on; running plans keep the price
 * they started with. A hidden plan or extra is no longer offered to members.
 */
export default function PricesPage() {
  const { t, tn } = useI18n();
  const { data, error, loading, setData } = useLoad(async () => {
    const [tariffs, extras] = await Promise.all([api.allTariffs(), api.allExtras()]);
    return { tariffs, extras };
  }, "prices");

  if (loading && !data) return <Spinner />;
  if (!data) return <Banner>{error}</Banner>;

  return (
    <>
      <PageHeader title={t("Plans and prices")} sub={t("Price changes apply to new plans. Existing plans keep the price they started with.")} />
      <div className="flex flex-col gap-5">
        <Card title={t("Plans (per month)")}>
          <Table head={[t("Plan"), t("Washes"), t("Price"), t("Offered"), ""]}>
            {data.tariffs.map((x) => (
              <PriceRow
                key={x.id}
                item={x}
                detail={tn(x.washesPerMonth, "{n} wash per month", "{n} washes per month")}
                save={(body) => api.updateTariff(x.id, body)}
                onSaved={(u) => setData((d) => ({ ...d!, tariffs: d!.tariffs.map((v) => (v.id === u.id ? (u as Tariff) : v)) }))}
              />
            ))}
          </Table>
        </Card>
        <Card title={t("Extra services (per wash)")}>
          <Table head={[t("Extra"), t("Description"), t("Price"), t("Offered"), ""]}>
            {data.extras.map((x) => (
              <PriceRow
                key={x.id}
                item={x}
                detail={t(x.description)}
                save={(body) => api.updateExtra(x.id, body)}
                onSaved={(u) => setData((d) => ({ ...d!, extras: d!.extras.map((v) => (v.id === u.id ? u : v)) }))}
              />
            ))}
          </Table>
        </Card>
      </div>
    </>
  );
}

function PriceRow({
  item,
  detail,
  save,
  onSaved,
}: {
  item: Extra;
  detail: string;
  save: (body: { price?: number; active?: boolean }) => Promise<Extra>;
  onSaved: (u: Extra) => void;
}) {
  const { t, fmt } = useI18n();
  const [price, setPrice] = useState(String(item.price));
  const [busy, setBusy] = useState<"price" | "active" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const parsed = Number(price.replace(/[^\d]/g, ""));
  const changed = price.trim() !== "" && parsed !== item.price;

  const run = async (what: "price" | "active", body: { price?: number; active?: boolean }) => {
    setBusy(what);
    setError(null);
    try {
      const u = await save(body);
      onSaved(u);
      setPrice(String(u.price));
    } catch (e) {
      setError(errorText(e, t));
    } finally {
      setBusy(null);
    }
  };

  return (
    <tr>
      <td className="font-medium">
        {fmt.name(item.name)}
        {error ? <span className="block text-xs font-normal text-bad">{error}</span> : null}
      </td>
      <td className="text-[13px] text-ink-2">{detail}</td>
      <td>
        <div className="flex items-center gap-2">
          <Input inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} className="h-8 !w-32 text-right tabular-nums" aria-label={t("Price")} />
          <span className="text-xs whitespace-nowrap text-ink-3">{changed ? t("now {price}", { price: fmt.krw(item.price) }) : "원"}</span>
        </div>
      </td>
      <td>
        <button
          role="switch"
          aria-checked={item.active}
          disabled={busy === "active"}
          onClick={() => run("active", { active: !item.active })}
          className="cursor-pointer disabled:opacity-50"
        >
          {item.active ? <Badge tone="ok">{t("Offered")}</Badge> : <Badge>{t("Hidden")}</Badge>}
        </button>
      </td>
      <td className="text-right">
        <Button size="sm" variant="primary" disabled={!changed} busy={busy === "price"} onClick={() => run("price", { price: parsed })}>
          {t("Save")}
        </Button>
      </td>
    </tr>
  );
}
