"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { BillBadge } from "@/components/status";
import { Banner, Button, Card, Empty, Field, Input, Modal, PageHeader, Select, Spinner, Stat, Table, cx } from "@/components/ui";
import { api } from "@/lib/api";
import { addMonths, today } from "@/lib/format";
import { useI18n } from "@/lib/i18n";
import type { Invoice, InvoiceMonth, PaymentMethod } from "@/lib/types";
import { errorText, useLoad } from "@/lib/use-load";

type Filter = "unpaid" | "overdue" | "paid" | "all";
const FILTERS: Filter[] = ["unpaid", "overdue", "paid", "all"];
const FILTER_LABEL: Record<Filter, string> = { unpaid: "Unpaid", overdue: "Overdue", paid: "Paid", all: "All" };
const METHODS: PaymentMethod[] = ["bank_transfer", "cash", "card", "other"];
const METHOD_LABEL: Record<PaymentMethod, string> = { bank_transfer: "Bank transfer", cash: "Cash", card: "Card", other: "Other" };
const MONTH_RE = /^\d{4}-\d{2}$/;

/**
 * Money: a month's bills, what came in and what is still open. Members pay outside the app
 * (bank transfer, cash); an admin marks each bill paid here. Overdue bills of every month are one filter away.
 */
function PaymentsPage() {
  const { t, tn, fmt } = useI18n();
  const router = useRouter();
  const params = useSearchParams();
  const month = MONTH_RE.test(params.get("month") ?? "") ? params.get("month")! : today().slice(0, 7);
  const filter = FILTERS.includes(params.get("filter") as Filter) ? (params.get("filter") as Filter) : "unpaid";
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState<Invoice | null>(null);
  const [error, setError] = useState<string | null>(null);

  const go = (next: { month?: string; filter?: Filter }) =>
    router.replace(`/payments?month=${next.month ?? month}&filter=${next.filter ?? filter}`);

  const { data, error: loadError, loading, setData } = useLoad(async () => {
    const [bills, overdue] = await Promise.all([api.invoices(month), api.overdueInvoices()]);
    return { bills, overdue };
  }, month);

  if (loading && !data) return <Spinner />;
  if (!data) return <Banner>{loadError}</Banner>;

  const { bills, overdue } = data;
  const overdueTotal = overdue.reduce((s, b) => s + b.amount, 0);
  const list = (filter === "overdue" ? overdue : bills.invoices).filter((b) => {
    if (filter === "unpaid" && b.status !== "unpaid") return false;
    if (filter === "paid" && b.status !== "paid") return false;
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return [b.plateNumber, b.member?.name, b.member?.phone, b.member?.apartmentName].some((v) => v?.toLowerCase().includes(q));
  });

  /** Puts the changed bill into both lists and recounts the month. */
  const replace = (bill: Invoice) =>
    setData((d) => {
      const prev = d!;
      const invoices = prev.bills.invoices.map((b) => (b.id === bill.id ? { ...b, ...bill } : b));
      return {
        bills: { ...prev.bills, invoices, totals: totals(invoices) },
        overdue: prev.overdue.flatMap((b) => (b.id === bill.id ? (bill.status === "unpaid" && bill.overdue ? [{ ...b, ...bill }] : []) : [b])),
      };
    });

  const markUnpaid = async (bill: Invoice) => {
    if (!window.confirm(t("Mark this bill unpaid again?"))) return;
    setError(null);
    try {
      replace(await api.setInvoiceStatus(bill.id, { status: "unpaid" }));
    } catch (e) {
      setError(errorText(e, t));
    }
  };

  return (
    <>
      <PageHeader
        title={t("Payments")}
        sub={fmt.month(month)}
        actions={
          <>
            <Button size="sm" onClick={() => go({ month: addMonths(month, -1) })} aria-label={t("Previous month")}>
              ←
            </Button>
            <Input type="month" value={month} onChange={(e) => MONTH_RE.test(e.target.value) && go({ month: e.target.value })} className="h-8 !w-40" aria-label={t("Month")} />
            <Button size="sm" onClick={() => go({ month: addMonths(month, 1) })} aria-label={t("Next month")}>
              →
            </Button>
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 xl:grid-cols-4">
        <Stat label={t("Billed")} value={fmt.krw(bills.totals.billed)} sub={tn(bills.totals.count, "{n} bill", "{n} bills")} />
        <Stat label={t("Received")} value={fmt.krw(bills.totals.paid)} tone={bills.totals.paid ? "ok" : undefined} />
        <Stat label={t("Unpaid")} value={fmt.krw(bills.totals.unpaid)} sub={tn(bills.totals.unpaidCount, "{n} bill", "{n} bills")} />
        <Stat label={t("Overdue (all months)")} value={fmt.krw(overdueTotal)} sub={tn(overdue.length, "{n} bill", "{n} bills")} tone={overdue.length ? "bad" : undefined} />
      </div>

      {error ? <div className="mb-3"><Banner>{error}</Banner></div> : null}

      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <div className="flex rounded-lg border border-line p-0.5" role="tablist">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={filter === f}
                onClick={() => go({ filter: f })}
                className={cx("rounded-md px-3 py-1 text-[13px] cursor-pointer", filter === f ? "bg-accent text-on-accent" : "text-ink-2 hover:text-ink")}
              >
                {t(FILTER_LABEL[f])}
                {f === "overdue" && overdue.length ? ` ${overdue.length}` : ""}
              </button>
            ))}
          </div>
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("Search plate, name or phone")} className="ml-auto h-8 !w-64" aria-label={t("Search")} />
        </div>
        {filter === "overdue" ? <p className="border-b border-line px-4 py-2 text-[13px] text-ink-2">{t("Unpaid bills past their due date, from every month.")}</p> : null}
        {list.length === 0 ? (
          <Empty title={filter === "unpaid" || filter === "overdue" ? t("Nothing outstanding") : t("No bills")} />
        ) : (
          <Table head={[t("Car"), t("Member"), t("Month"), t("Amount"), t("Due"), t("Status"), ""]}>
            {list.map((b) => (
              <tr key={b.id}>
                <td className="font-medium whitespace-nowrap">{b.plateNumber}</td>
                <td>
                  {b.member?.name ?? "—"}
                  <span className="block text-xs text-ink-3">
                    {b.member ? `${fmt.phone(b.member.phone)} · ${b.member.apartmentName}` : ""}
                  </span>
                </td>
                <td className="whitespace-nowrap">{fmt.month(b.month)}</td>
                <td className="font-medium whitespace-nowrap tabular-nums">
                  {fmt.krw(b.amount)}
                  <span className="block text-xs font-normal text-ink-3">{b.lines.map((l) => (l.name ? fmt.name(l.name) : l.label)).join(" + ")}</span>
                </td>
                <td className="whitespace-nowrap">{fmt.day(b.dueDate)}</td>
                <td className="whitespace-nowrap">
                  <BillBadge status={b.status} overdue={b.overdue} />
                  {b.status === "paid" ? (
                    <span className="block text-xs text-ink-3">
                      {b.method ? t(METHOD_LABEL[b.method]) : ""}
                      {b.paidAt ? ` · ${fmt.day(b.paidAt.slice(0, 10))}` : ""}
                    </span>
                  ) : null}
                </td>
                <td className="text-right whitespace-nowrap">
                  {b.status === "unpaid" ? (
                    <Button size="sm" variant="primary" onClick={() => setPaying(b)}>
                      {t("Mark paid")}
                    </Button>
                  ) : b.status === "paid" ? (
                    <Button size="sm" variant="ghost" onClick={() => markUnpaid(b)}>
                      {t("Mark unpaid")}
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Card>

      {paying ? <PayModal bill={paying} onClose={() => setPaying(null)} onPaid={(b) => (replace(b), setPaying(null))} /> : null}
    </>
  );
}

function totals(invoices: Invoice[]): InvoiceMonth["totals"] {
  const live = invoices.filter((b) => b.status !== "void");
  const paid = live.filter((b) => b.status === "paid");
  const unpaid = live.filter((b) => b.status === "unpaid");
  const sum = (l: Invoice[]) => l.reduce((s, b) => s + b.amount, 0);
  return { billed: sum(live), paid: sum(paid), unpaid: sum(unpaid), count: live.length, unpaidCount: unpaid.length };
}

/** How the money came in, and an optional note (e.g. the sender's name on the transfer). */
function PayModal({ bill, onClose, onPaid }: { bill: Invoice; onClose: () => void; onPaid: (b: Invoice) => void }) {
  const { t, fmt } = useI18n();
  const [method, setMethod] = useState<PaymentMethod>("bank_transfer");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      onPaid(await api.setInvoiceStatus(bill.id, { status: "paid", method, note: note.trim() || undefined }));
    } catch (e) {
      setError(errorText(e, t));
      setBusy(false);
    }
  };

  return (
    <Modal title={t("Mark paid")} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p>
          <span className="font-semibold">{bill.plateNumber}</span> · {bill.member?.name} · {fmt.month(bill.month)}
          <span className="block text-xl font-semibold">{fmt.krw(bill.amount)}</span>
        </p>
        {error ? <Banner>{error}</Banner> : null}
        <Field label={t("Paid by")}>
          <Select value={method} onChange={(e) => setMethod(e.target.value as PaymentMethod)}>
            {METHODS.map((m) => (
              <option key={m} value={m}>
                {t(METHOD_LABEL[m])}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={t("Note (optional)")}>
          <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={300} placeholder={t("e.g. sender name on the transfer")} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button onClick={onClose}>{t("Cancel")}</Button>
          <Button variant="primary" busy={busy} onClick={submit}>
            {t("Mark paid")}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Spinner />}>
      <PaymentsPage />
    </Suspense>
  );
}
