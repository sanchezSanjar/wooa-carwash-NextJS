"use client";

import { useState } from "react";
import { Banner, Button, Field, Input, Modal, Select } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n, type Lang } from "@/lib/i18n";
import type { Role, User } from "@/lib/types";
import { errorText } from "@/lib/use-load";

const MOBILE_RE = /^(\+?82[\s-]?|0)1[016789][\s-]?\d{3,4}[\s-]?\d{4}$/;

/** A new account. The member gets an SMS and sets a password with "Forgot password" in the app. */
export function NewMemberModal({ onClose, onCreated }: { onClose: () => void; onCreated: (u: User) => void }) {
  const { t } = useI18n();
  const [form, setForm] = useState({ name: "", phone: "", apartmentName: "", email: "" });
  const [role, setRole] = useState<Role>("customer");
  const [language, setLanguage] = useState<Lang>("ko");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !MOBILE_RE.test(form.phone.trim()) || !form.apartmentName.trim()) {
      setError(t("Enter a name, a mobile number like 010-1234-5678 and an apartment"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      onCreated(
        await api.createMember({
          name: form.name.trim(),
          phone: form.phone.trim(),
          apartmentName: form.apartmentName.trim(),
          email: form.email.trim() || undefined,
          role,
          language,
        }),
      );
    } catch (err) {
      setError(errorText(err, t));
      setBusy(false);
    }
  };

  return (
    <Modal title={t("New member")} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-3" noValidate>
        <p className="text-[13px] text-ink-2">{t("They get an SMS and set their own password with “Forgot password”.")}</p>
        {error ? <Banner>{error}</Banner> : null}
        <Field label={t("Name")}>
          <Input value={form.name} onChange={set("name")} maxLength={80} autoFocus />
        </Field>
        <Field label={t("Mobile number")}>
          <Input type="tel" value={form.phone} onChange={set("phone")} placeholder="010-1234-5678" />
        </Field>
        <Field label={t("Apartment name")}>
          <Input value={form.apartmentName} onChange={set("apartmentName")} maxLength={100} placeholder="Raemian Gwanggyo" />
        </Field>
        <Field label={t("Email (optional)")}>
          <Input type="email" value={form.email} onChange={set("email")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("Role")}>
            <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
              <option value="customer">{t("Customer")}</option>
              <option value="washer">{t("Washer")}</option>
              <option value="admin">{t("Admin")}</option>
            </Select>
          </Field>
          <Field label={t("Text messages in")}>
            <Select value={language} onChange={(e) => setLanguage(e.target.value as Lang)}>
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </Select>
          </Field>
        </div>
        <div className="mt-1 flex justify-end gap-2">
          <Button type="button" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button type="submit" variant="primary" busy={busy}>
            {t("Create account")}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
