"use client";

import { useRef, useState } from "react";
import { Badge, Banner, Button, Modal, Select, Stat, Table } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { SheetImportPreview } from "@/lib/types";
import { errorText } from "@/lib/use-load";

const CHANGE_TONE = { order: "neutral", washer: "info", note: "neutral", moved: "warn", removed: "bad", added: "ok" } as const;

/**
 * Excel: download the day sheets (one tab per day) to edit offline, then upload the file again.
 * The upload is only a preview until "Apply"; it lists every change and every problem first.
 */
export function ExcelTools({ date, onImported }: { date: string; onImported: () => void }) {
  const { t, fmt } = useI18n();
  const [days, setDays] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState<SheetImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const download = () => {
    setExporting(true);
    // a plain link: the proxy adds the login, the browser saves the file with the API's name
    const a = document.createElement("a");
    a.href = api.exportUrl(date, days);
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => setExporting(false), 1500);
  };

  const pick = async (f: File | undefined) => {
    if (!f) return;
    setError(null);
    setDone(null);
    setBusy(true);
    try {
      setPreview(await api.previewImport(f));
    } catch (e) {
      setError(errorText(e, t));
    } finally {
      setBusy(false);
      if (file.current) file.current.value = "";
    }
  };

  const apply = async () => {
    if (!preview) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api.applyImport(preview.plan);
      setPreview(null);
      setDone(res.saved.length ? t("Saved {days}", { days: res.saved.map(fmt.day).join(", ") }) : t("Nothing to change"));
      onImported();
    } catch (e) {
      setError(errorText(e, t));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        <Select value={days} onChange={(e) => setDays(Number(e.target.value))} className="h-8 text-[13px]" aria-label={t("Days to export")}>
          <option value={1}>{t("This day")}</option>
          <option value={7}>{t("This day and the next 6")}</option>
          <option value={14}>{t("Two weeks")}</option>
        </Select>
        <Button size="sm" busy={exporting} onClick={download}>
          {t("Export to Excel")}
        </Button>
        <Button size="sm" busy={busy && !preview} onClick={() => file.current?.click()}>
          {t("Import from Excel")}
        </Button>
        <input ref={file} type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden onChange={(e) => pick(e.target.files?.[0])} />
      </div>
      {error && !preview ? <div className="basis-full"><Banner>{error}</Banner></div> : null}
      {done ? <div className="basis-full"><Banner tone="ok">{done}</Banner></div> : null}

      {preview ? (
        <Modal title={t("Import day sheet")} onClose={() => setPreview(null)} wide>
          <div className="flex flex-col gap-4">
            <p className="text-[13px] text-ink-2">
              {preview.filename ?? t("Workbook")} · {t("{n} rows", { n: preview.rowsRead })} · {preview.days.map(fmt.day).join(", ")}
            </p>
            <div className="grid grid-cols-3 gap-2">
              <Stat label={t("Unchanged")} value={preview.unchanged} />
              <Stat label={t("Changes")} value={preview.changes.length} />
              <Stat label={t("Problems")} value={preview.problems.length} tone={preview.problems.length ? "bad" : undefined} />
            </div>
            {error ? <Banner>{error}</Banner> : null}
            {preview.problems.length ? (
              <div>
                <p className="mb-1 font-medium text-bad">{t("Problems")}</p>
                <ul className="flex flex-col gap-1 text-[13px]">
                  {preview.problems.map((p, i) => (
                    <li key={i}>
                      <span className="text-ink-3">
                        {p.sheet} · {t("Row {row}", { row: p.row })}
                        {p.plateNumber ? ` · ${p.plateNumber}` : ""}
                      </span>{" "}
                      {p.message}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {preview.changes.length ? (
              <div className="max-h-72 overflow-y-auto rounded-lg border border-line">
                <Table head={[t("Day"), t("Car"), t("Change")]}>
                  {preview.changes.map((c, i) => (
                    <tr key={i}>
                      <td className="whitespace-nowrap">{fmt.day(c.date)}</td>
                      <td className="font-medium whitespace-nowrap">{c.plateNumber}</td>
                      <td>
                        <Badge tone={CHANGE_TONE[c.type]}>{t(c.type)}</Badge> <span className="text-[13px] text-ink-2">{c.detail}</span>
                      </td>
                    </tr>
                  ))}
                </Table>
              </div>
            ) : (
              <p className="text-[13px] text-ink-2">{t("The file matches the day sheets. Nothing to change.")}</p>
            )}
            <p className="text-xs text-ink-3">{t("Only the day sheets change. Cars, members, plans and wash results stay as they are.")}</p>
            <div className="flex justify-end gap-2">
              <Button onClick={() => setPreview(null)}>{t("Cancel")}</Button>
              <Button variant="primary" busy={busy} disabled={!preview.plan.length} onClick={apply}>
                {preview.plan.length ? t("Apply {n} changes", { n: preview.changes.length }) : t("Nothing to apply")}
              </Button>
            </div>
          </div>
        </Modal>
      ) : null}
    </>
  );
}
