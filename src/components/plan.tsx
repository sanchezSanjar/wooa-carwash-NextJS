"use client";

import { useState } from "react";
import { WashModal } from "@/components/day-sheet/wash";
import { Stars, WashBadge } from "@/components/status";
import { Badge, Banner, Button, Modal } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { AdminSubscription } from "@/lib/types";
import { errorText } from "@/lib/use-load";

/** One plan: what it includes, upcoming wash days, recent washes, and cancelling it. */
export function PlanModal({ plan, onClose, onCancelled }: { plan: AdminSubscription; onClose: () => void; onCancelled: () => void }) {
  const { t, tn, fmt } = useI18n();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [wash, setWash] = useState<string | null>(null);

  const cancel = async () => {
    if (!window.confirm(t("Cancel this plan? No more washes or bills from now on. This can't be undone."))) return;
    setBusy(true);
    setError(null);
    try {
      await api.cancelSubscription(plan.id);
      onCancelled();
    } catch (e) {
      setError(errorText(e, t));
      setBusy(false);
    }
  };

  return (
    <Modal title={`${plan.car?.plateNumber ?? ""} · ${plan.tariffName}`} onClose={onClose} wide>
      <div className="flex flex-col gap-5">
        {error ? <Banner>{error}</Banner> : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-[13px]">
            <dt className="text-ink-3">{t("Member")}</dt>
            <dd>
              {plan.member?.name} · {plan.member ? fmt.phone(plan.member.phone) : ""}
            </dd>
            <dt className="text-ink-3">{t("Car")}</dt>
            <dd>
              {plan.car ? `${plan.car.brand} ${plan.car.model} · ${t(plan.car.color)} · ${t("Bldg {building} {floor}", { building: plan.car.buildingNumber, floor: plan.car.parkingFloor })}` : "—"}
            </dd>
            <dt className="text-ink-3">{t("Wash days")}</dt>
            <dd>{fmt.schedule(plan.schedule)}</dd>
            <dt className="text-ink-3">{t("Extras")}</dt>
            <dd>{plan.extras.length ? plan.extras.map((e) => `${e.name} (${fmt.krw(e.price)})`).join(", ") : "—"}</dd>
            <dt className="text-ink-3">{t("Per month")}</dt>
            <dd className="font-medium">
              {fmt.krw(plan.monthlyPrice)} <span className="font-normal text-ink-3">({t("plan {price}", { price: fmt.krw(plan.tariffPrice) })})</span>
            </dd>
            <dt className="text-ink-3">{t("Started")}</dt>
            <dd>{fmt.day(plan.startDate)}</dd>
          </dl>
          <div>
            <p className="mb-1.5 font-medium">{t("Upcoming washes")}</p>
            <div className="flex flex-wrap gap-1.5">
              {plan.upcoming.length ? plan.upcoming.map((d) => <Badge key={d}>{fmt.day(d)}</Badge>) : <span className="text-[13px] text-ink-3">—</span>}
            </div>
          </div>
        </div>

        <div>
          <p className="mb-1.5 font-medium">{t("Recent washes")}</p>
          {plan.history.length === 0 ? (
            <p className="text-[13px] text-ink-3">{t("No washes recorded yet.")}</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {plan.history.map((h) => (
                <li key={h.date}>
                  <button onClick={() => setWash(h.date)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-soft cursor-pointer">
                    <span className="w-28 whitespace-nowrap">{fmt.day(h.date)}</span>
                    <WashBadge status={h.status} />
                    <span className="min-w-0 flex-1 truncate text-[13px] text-ink-2">{h.note}</span>
                    {h.photos ? <span className="text-xs text-ink-3">{tn(h.photos, "{n} photo", "{n} photos")}</span> : null}
                    {h.rating ? <Stars rating={h.rating} /> : null}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
          <span className="text-[13px] text-ink-3">{t("To change days or extras, the member uses the app.")}</span>
          <Button variant="danger" busy={busy} onClick={cancel}>
            {t("Cancel plan")}
          </Button>
        </div>
      </div>
      {wash ? <WashModal subscriptionId={plan.id} date={wash} onClose={() => setWash(null)} /> : null}
    </Modal>
  );
}
