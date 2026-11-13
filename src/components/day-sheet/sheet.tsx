"use client";

import { useEffect, useState } from "react";
import { WashBadge } from "@/components/status";
import { Badge, Banner, Button, Card, Empty, Input, Select, Spinner, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { addDays, today } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { DaySheet, DaySheetRow, StaffMember, WashStatus } from "@/lib/types";
import { errorText, useLoad } from "@/lib/use-load";
import { AddCarsModal } from "./add-cars";
import { ExcelTools } from "./excel";
import { MoveModal } from "./move";
import { WashModal } from "./wash";

export const keyOf = (r: { subscriptionId: string; scheduledDate: string }) => `${r.subscriptionId}|${r.scheduledDate}`;
const toSave = (rows: DaySheetRow[]) =>
  rows.map((r) => ({ subscriptionId: r.subscriptionId, scheduledDate: r.scheduledDate, washerId: r.washerId ?? undefined, note: r.note }));

/**
 * One day's work: the order to walk the route, who washes which car, notes, and each wash's result.
 * Changes to order, washers and notes are kept here until "Save sheet"; wash results save at once.
 * Only the day sheet changes: cars, members and plans stay as they are.
 */
export function SheetForDay({ date }: { date: string }) {
  const { t, tn, fmt } = useI18n();
  const { data, error: loadError, loading, reload } = useLoad(async () => {
    const [sheet, staff] = await Promise.all([api.daySheet(date), api.sheetStaff()]);
    return { sheet, staff };
  }, date);

  if (loading && !data) return <Spinner />;
  if (!data) return <Banner>{loadError}</Banner>;
  return <Editor key={data.sheet.updatedAt ?? "draft"} initial={data.sheet} staff={data.staff} date={date} onReload={reload} t={t} tn={tn} fmt={fmt} />;
}

function Editor({
  initial,
  staff,
  date,
  onReload,
  t,
  tn,
  fmt,
}: {
  initial: DaySheet;
  staff: StaffMember[];
  date: string;
  onReload: () => void;
  t: ReturnType<typeof useI18n>["t"];
  tn: ReturnType<typeof useI18n>["tn"];
  fmt: ReturnType<typeof useI18n>["fmt"];
}) {
  const [sheet, setSheet] = useState(initial);
  const [rows, setRows] = useState(initial.rows);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [moving, setMoving] = useState<DaySheetRow | null>(null);
  const [viewing, setViewing] = useState<DaySheetRow | null>(null);

  const dirty = JSON.stringify(toSave(rows)) !== JSON.stringify(toSave(sheet.rows));
  const done = rows.filter((r) => r.status === "done").length;
  const skipped = rows.filter((r) => r.status === "skipped").length;
  const isFuture = date > today();

  // leaving the page with unsaved changes asks first
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const accept = (s: DaySheet) => {
    setSheet(s);
    setRows(s.rows);
  };
  const patch = (key: string, change: Partial<DaySheetRow>) => setRows((list) => list.map((r) => (keyOf(r) === key ? { ...r, ...change } : r)));
  const moveBy = (i: number, delta: number) =>
    setRows((list) => {
      const j = i + delta;
      if (j < 0 || j >= list.length) return list;
      const next = [...list];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      accept(await api.saveDaySheet(date, toSave(rows)));
    } catch (e) {
      setError(errorText(e, t));
    } finally {
      setSaving(false);
    }
  };

  const setStatus = async (row: DaySheetRow, status: WashStatus) => {
    setBusy(keyOf(row));
    setError(null);
    try {
      await api.setWashStatus({ subscriptionId: row.subscriptionId, date: row.scheduledDate, status, washedOn: status === "planned" ? undefined : date });
      const change = { status, washedOn: status === "planned" ? null : date };
      patch(keyOf(row), change);
      setSheet((s) => ({ ...s, rows: s.rows.map((r) => (keyOf(r) === keyOf(row) ? { ...r, ...change } : r)) }));
    } catch (e) {
      setError(errorText(e, t));
    } finally {
      setBusy(null);
    }
  };

  const moveTo = async (row: DaySheetRow, toDate: string) => {
    setMoving(null);
    if (dirty && !window.confirm(t("Moving saves this sheet first. Save and move?"))) return;
    setBusy(keyOf(row));
    setError(null);
    try {
      if (dirty) await api.saveDaySheet(date, toSave(rows));
      accept((await api.moveWash(date, { subscriptionId: row.subscriptionId, scheduledDate: row.scheduledDate, toDate })).from);
    } catch (e) {
      setError(errorText(e, t));
    } finally {
      setBusy(null);
    }
  };

  const washerName = (id: string | null) => staff.find((s) => s.id === id)?.name ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {sheet.weather ? (
          <Badge tone={sheet.weather.wet ? "warn" : "info"}>
            {sheet.weather.wet ? "☂ " : ""}
            {t("{pop}% chance of rain", { pop: sheet.weather.pop })}
            {sheet.weather.tempMin != null && sheet.weather.tempMax != null ? ` · ${sheet.weather.tempMin}°–${sheet.weather.tempMax}°` : ""}
          </Badge>
        ) : null}
        <Badge tone="ok">{t("{n} washed", { n: done })}</Badge>
        {skipped ? <Badge tone="warn">{t("{n} skipped", { n: skipped })}</Badge> : null}
        <Badge>{t("{n} to do", { n: rows.length - done - skipped })}</Badge>
        <span className="text-[13px] text-ink-3">
          {sheet.saved && sheet.updatedAt ? t("Saved {time}", { time: fmt.dateTime(sheet.updatedAt) }) : t("Draft from the schedule (not saved yet)")}
        </span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" onClick={() => setAdding(true)}>
            + {t("Add a car")}
          </Button>
          <ExcelTools date={date} onImported={onReload} />
        </div>
      </div>

      {error ? <Banner>{error}</Banner> : null}

      {dirty ? (
        <div className="sticky top-2 z-10 flex flex-wrap items-center gap-3 rounded-xl border border-line bg-warn-soft px-4 py-2.5">
          <span className="text-warn">{t("You have unsaved changes to this sheet.")}</span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="ghost" onClick={() => setRows(sheet.rows)}>
              {t("Discard")}
            </Button>
            <Button size="sm" variant="primary" busy={saving} onClick={save}>
              {t("Save sheet")}
            </Button>
          </div>
        </div>
      ) : null}

      <Card>
        {rows.length === 0 ? (
          <Empty title={t("No cars on this day")}>{t("Add a car that missed its wash or is due soon.")}</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-line text-xs text-ink-3">
                  {["#", t("Building · floor"), t("Car"), t("Member"), t("Plan and extras"), t("Washer"), t("Note"), t("Status"), ""].map((h, i) => (
                    <th key={i} className="px-3 py-2 font-normal whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => {
                  const k = keyOf(r);
                  return (
                    <tr key={k} className={cx("border-b border-line last:border-0 align-top", r.status !== "planned" && "bg-soft/40")}>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-1">
                          <span className="w-5 text-center font-semibold tabular-nums">{i + 1}</span>
                          <div className="flex flex-col">
                            <button className="px-1 text-ink-3 hover:text-ink disabled:opacity-30 cursor-pointer" disabled={i === 0} onClick={() => moveBy(i, -1)} aria-label={t("Move up")}>
                              ▲
                            </button>
                            <button className="px-1 text-ink-3 hover:text-ink disabled:opacity-30 cursor-pointer" disabled={i === rows.length - 1} onClick={() => moveBy(i, 1)} aria-label={t("Move down")}>
                              ▼
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        {r.car.buildingNumber} · {r.car.parkingFloor}
                        <span className="block text-xs text-ink-3">
                          {r.car.arrivesHomeAt}–{r.car.leavesForWorkAt}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className="font-semibold">{r.car.plateNumber}</span>
                        <span className="block text-xs text-ink-2">
                          {r.car.brand} {r.car.model} · {t(r.car.color)}
                        </span>
                        {r.moved ? (
                          <span className="mt-1 block">
                            <Badge tone="warn">{t("Moved from {date}", { date: fmt.day(r.scheduledDate) })}</Badge>
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.member.name}
                        <a href={`tel:${r.member.phone}`} className="block text-xs text-info hover:underline">
                          {fmt.phone(r.member.phone)}
                        </a>
                      </td>
                      <td className="px-3 py-2.5 text-[13px]">
                        {r.tariffName}
                        {r.extras.length ? <span className="block text-xs text-ink-2">+ {r.extras.join(", ")}</span> : null}
                      </td>
                      <td className="px-3 py-2.5">
                        <Select value={r.washerId ?? ""} onChange={(e) => patch(k, { washerId: e.target.value || null, washerName: washerName(e.target.value || null) })} className="h-8 max-w-36 text-[13px]" aria-label={t("Washer")}>
                          <option value="">{t("Anyone")}</option>
                          {staff.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </Select>
                      </td>
                      <td className="px-3 py-2.5">
                        <Input value={r.note} onChange={(e) => patch(k, { note: e.target.value })} maxLength={300} className="h-8 min-w-36 text-[13px]" placeholder={t("Note for the washer")} aria-label={t("Note")} />
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <WashBadge status={r.status} />
                        {r.photos ? <span className="mt-1 block text-xs text-ink-3">{tn(r.photos, "{n} photo", "{n} photos")}</span> : null}
                        {r.rating ? <span className="block text-xs text-warn">★ {r.rating}</span> : null}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="flex flex-nowrap items-center justify-end gap-1">
                          {r.status === "planned" ? (
                            <>
                              <Button size="sm" variant="primary" busy={busy === k} disabled={isFuture} title={isFuture ? t("A wash can only be recorded on or after its day") : undefined} onClick={() => setStatus(r, "done")}>
                                {t("Washed")}
                              </Button>
                              <Button size="sm" disabled={busy === k || isFuture} onClick={() => setStatus(r, "skipped")}>
                                {t("Skip")}
                              </Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" busy={busy === k} onClick={() => setStatus(r, "planned")}>
                              {t("Undo")}
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => setViewing(r)}>
                            {t("Photos")}
                          </Button>
                          <Button size="sm" variant="ghost" disabled={r.status === "done" || busy === k} onClick={() => setMoving(r)}>
                            {t("Move")}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={r.status === "done"}
                            onClick={() => setRows((list) => list.filter((x) => keyOf(x) !== k))}
                            aria-label={t("Remove from this day")}
                            title={t("Remove from this day")}
                          >
                            ✕
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {adding ? (
        <AddCarsModal
          date={date}
          existing={new Set(rows.map(keyOf))}
          onAdd={(c) => setRows((list) => (list.some((r) => keyOf(r) === keyOf(c)) ? list : [...list, { ...c, moved: c.scheduledDate !== date }]))}
          onClose={() => setAdding(false)}
        />
      ) : null}
      {moving ? <MoveModal row={moving} from={date} days={Array.from({ length: 14 }, (_, i) => addDays(today(), i)).filter((d) => d !== date)} onMove={(d) => moveTo(moving, d)} onClose={() => setMoving(null)} /> : null}
      {viewing ? <WashModal subscriptionId={viewing.subscriptionId} date={viewing.scheduledDate} onClose={() => setViewing(null)} /> : null}
    </div>
  );
}
