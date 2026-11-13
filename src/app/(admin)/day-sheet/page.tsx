"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { SheetForDay } from "@/components/day-sheet/sheet";
import { Button, Input, PageHeader, Spinner } from "@/components/ui";
import { addDays, today } from "@/lib/format";
import { useI18n } from "@/lib/i18n";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function DaySheetPage() {
  const { t, fmt } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const asked = params.get("date") ?? "";
  const date = DATE_RE.test(asked) ? asked : today();
  const go = (d: string) => router.replace(`/day-sheet?date=${d}`);

  return (
    <>
      <PageHeader
        title={t("Day sheet")}
        sub={fmt.dayLong(date)}
        actions={
          <>
            <Button size="sm" onClick={() => go(addDays(date, -1))} aria-label={t("Previous day")}>
              ←
            </Button>
            <Input type="date" value={date} onChange={(e) => DATE_RE.test(e.target.value) && go(e.target.value)} className="h-8 !w-40" aria-label={t("Date")} />
            <Button size="sm" onClick={() => go(addDays(date, 1))} aria-label={t("Next day")}>
              →
            </Button>
            {date !== today() ? (
              <Button size="sm" variant="ghost" onClick={() => go(today())}>
                {t("Today")}
              </Button>
            ) : null}
          </>
        }
      />
      {/* a fresh sheet per day: nothing unsaved leaks from one day to another */}
      <SheetForDay key={date} date={date} />
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <DaySheetPage />
    </Suspense>
  );
}
