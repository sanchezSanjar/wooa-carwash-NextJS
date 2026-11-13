"use client";

import { useEffect, useState } from "react";
import { Badge, Banner, Button, Field, Input, Modal, Select, Spinner } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Role, User } from "@/lib/types";
import { errorText, useLoad } from "@/lib/use-load";

/** One member: edit details, role and block (not for your own account), and their cars. */
export function MemberModal({ member, onClose, onChange }: { member: User; onClose: () => void; onChange: (u: User) => void }) {
  const { t, fmt } = useI18n();
  const [me, setMe] = useState<string | null>(null);
  const [form, setForm] = useState({ name: member.name, phone: fmt.phone(member.phone), apartmentName: member.apartmentName, email: member.email ?? "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.me().then((u) => setMe(u.id), () => undefined);
  }, []);
  const isMe = me === member.id;
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setSaved(false);
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };
  const changed =
    form.name.trim() !== member.name ||
    form.phone.replace(/\D/g, "") !== member.phone ||
    form.apartmentName.trim() !== member.apartmentName ||
    form.email.trim() !== (member.email ?? "");

  const update = async (what: string, body: Parameters<typeof api.updateMember>[1]) => {
    setBusy(what);
    setError(null);
    try {
      onChange(await api.updateMember(member.id, body));
      if (what === "details") setSaved(true);
    } catch (e) {
      setError(errorText(e, t));
    } finally {
      setBusy(null);
    }
  };

  const saveDetails = () =>
    update("details", { name: form.name.trim(), phone: form.phone.trim(), apartmentName: form.apartmentName.trim(), email: form.email.trim() });

  const toggleBlock = () => {
    const blocking = member.status !== "blocked";
    if (blocking && !window.confirm(t("Block {name}? They can't log in until unblocked.", { name: member.name }))) return;
    void update("status", { status: blocking ? "blocked" : "active" });
  };

  return (
    <Modal title={member.name} onClose={onClose} wide>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          {error ? <Banner>{error}</Banner> : null}
          {saved ? <Banner tone="ok">{t("Saved")}</Banner> : null}
          <Field label={t("Name")}>
            <Input value={form.name} onChange={set("name")} maxLength={80} />
          </Field>
          <Field label={t("Mobile number")}>
            <Input type="tel" value={form.phone} onChange={set("phone")} />
          </Field>
          <Field label={t("Apartment name")}>
            <Input value={form.apartmentName} onChange={set("apartmentName")} maxLength={100} />
          </Field>
          <Field label={t("Email (optional)")}>
            <Input type="email" value={form.email} onChange={set("email")} />
          </Field>
          <div className="flex justify-end">
            <Button variant="primary" busy={busy === "details"} disabled={!changed} onClick={saveDetails}>
              {t("Save changes")}
            </Button>
          </div>

          <div className="mt-2 flex flex-col gap-3 border-t border-line pt-4">
            {isMe ? (
              <p className="text-[13px] text-ink-2">{t("This is your account. Another admin can change its role or block it.")}</p>
            ) : (
              <>
                <Field label={t("Role")}>
                  <Select value={member.role} disabled={busy === "role"} onChange={(e) => update("role", { role: e.target.value as Role })}>
                    <option value="customer">{t("Customer")}</option>
                    <option value="washer">{t("Washer")}</option>
                    <option value="admin">{t("Admin")}</option>
                  </Select>
                </Field>
                <div className="flex items-center justify-between gap-3">
                  <span>{member.status === "blocked" ? <Badge tone="bad">{t("Blocked")}</Badge> : <Badge tone="ok">{t("Active")}</Badge>}</span>
                  <Button variant={member.status === "blocked" ? "secondary" : "danger"} busy={busy === "status"} onClick={toggleBlock}>
                    {member.status === "blocked" ? t("Unblock account") : t("Block account")}
                  </Button>
                </div>
              </>
            )}
            {member.hasPassword === false ? <Banner tone="warn">{t("No password yet: they were invited by SMS and haven't set one.")}</Banner> : null}
          </div>
        </div>
        <MemberCars memberId={member.id} />
      </div>
    </Modal>
  );
}

function MemberCars({ memberId }: { memberId: string }) {
  const { t, fmt } = useI18n();
  const { data, error, loading } = useLoad(async () => {
    const [cars, plans] = await Promise.all([api.carsForMember(memberId), api.subscriptions()]);
    return { cars, plans: plans.filter((p) => p.member?.id === memberId) };
  }, memberId);

  return (
    <div>
      <p className="mb-2 font-medium">{t("Cars")}</p>
      {error ? <Banner>{error}</Banner> : null}
      {loading && !data ? <Spinner /> : null}
      {data && data.cars.length === 0 ? <p className="text-[13px] text-ink-3">{t("No cars yet.")}</p> : null}
      <ul className="flex flex-col gap-2">
        {data?.cars.map((c) => {
          const plan = data.plans.find((p) => p.carId === c.id);
          return (
            <li key={c.id} className="rounded-lg border border-line px-3 py-2.5">
              <p className="font-semibold">{c.plateNumber}</p>
              <p className="text-[13px] text-ink-2">
                {c.brand} {c.model} · {t(c.color)} · {t("Bldg {building} {floor}", { building: c.buildingNumber, floor: c.parkingFloor })}
              </p>
              <p className="mt-1 text-[13px]">
                {plan ? (
                  <>
                    <Badge tone="ok">{fmt.name(plan.tariffName)}</Badge> <span className="text-ink-2">{fmt.krw(plan.monthlyPrice)} / {t("month")}</span>
                  </>
                ) : (
                  <Badge>{t("No active plan")}</Badge>
                )}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
