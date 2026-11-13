"use client";

import { Badge, Banner, Empty, Modal, Spinner, type Tone } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { SheetCandidate } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const keyOf = (r: { subscriptionId: string; scheduledDate: string }) => `${r.subscriptionId}|${r.scheduledDate}`;

const REASON: Record<SheetCandidate["reason"], { label: string; tone: Tone }> = {
  missed: { label: "Missed", tone: "warn" },
  skipped: { label: "Skipped", tone: "warn" },
  today: { label: "Today", tone: "info" },
  upcoming: { label: "Upcoming", tone: "neutral" },
};

/** Cars that can join this day: missed or skipped in the last two weeks, or due in the next week. */
export function AddCarsModal({
  date,
  existing,
  onAdd,
  onClose,
}: {
  date: string;
  existing: Set<string>;
  onAdd: (c: SheetCandidate) => void;
  onClose: () => void;
}) {
  const { t, fmt } = useI18n();
  const { data, error, loading } = useLoad(() => api.sheetCandidates(date), date);

  return (
    <Modal title={t("Add a car to {date}", { date: fmt.day(date) })} onClose={onClose} wide>
      {error ? <Banner>{error}</Banner> : null}
      {loading ? <Spinner /> : null}
      {data && data.length === 0 ? <Empty title={t("No other cars to add.")} /> : null}
      {data?.length ? (
        <>
          <p className="mb-2 text-[13px] text-ink-2">{t("Added cars appear at the end of the sheet. Save the sheet to keep them.")}</p>
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {data.map((c) => {
              const added = existing.has(keyOf(c));
              return (
                <li key={keyOf(c)}>
                  <button
                    disabled={added}
                    onClick={() => onAdd(c)}
                    className="flex w-full items-center gap-3 px-1 py-2.5 text-left hover:bg-soft disabled:cursor-default disabled:opacity-50 cursor-pointer"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">
                        {c.car.plateNumber} · {c.car.buildingNumber} {c.car.parkingFloor}
                      </span>
                      <span className="block text-[13px] text-ink-2">
                        {c.member.apartmentName} · {c.member.name} · {t("due {date}", { date: fmt.day(c.scheduledDate) })}
                      </span>
                    </span>
                    <Badge tone={added ? "ok" : REASON[c.reason].tone}>{added ? t("Added") : t(REASON[c.reason].label)}</Badge>
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      ) : null}
    </Modal>
  );
}
