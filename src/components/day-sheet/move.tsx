"use client";

import { Modal } from "@/components/ui";
import { useI18n } from "@/lib/i18n";
import type { DaySheetRow } from "@/lib/types";

/** Pick the day a car moves to (the next two weeks). The car's plan doesn't change. */
export function MoveModal({ row, from, days, onMove, onClose }: { row: DaySheetRow; from: string; days: string[]; onMove: (d: string) => void; onClose: () => void }) {
  const { t, fmt } = useI18n();
  return (
    <Modal title={t("Move {plate} to another day", { plate: row.car.plateNumber })} onClose={onClose}>
      <p className="mb-3 text-[13px] text-ink-2">{t("From {date}. Both day sheets are saved, the plan stays the same.", { date: fmt.day(from) })}</p>
      <div className="grid grid-cols-2 gap-2">
        {days.map((d) => (
          <button key={d} onClick={() => onMove(d)} className="rounded-lg border border-line px-3 py-2 text-left hover:bg-soft cursor-pointer">
            {fmt.day(d)}
          </button>
        ))}
      </div>
    </Modal>
  );
}
