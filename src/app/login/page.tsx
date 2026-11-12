"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { LanguageSwitch } from "@/components/language-switch";
import { Banner, Button, Field, Input } from "@/components/ui";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim() || !password) {
      setError(t("Enter your phone number and password"));
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phone.trim(), password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message ?? t("Could not log in"));
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError(t("Can't reach the server"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <p className="text-2xl font-semibold">우아세차</p>
          <p className="mt-1 text-ink-2">{t("Admin")}</p>
        </div>
        <form onSubmit={submit} className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-6" noValidate>
          {error ? <Banner>{error}</Banner> : null}
          <Field label={t("Mobile number")}>
            <Input type="tel" autoComplete="username" placeholder="010-1234-5678" value={phone} onChange={(e) => setPhone(e.target.value)} autoFocus />
          </Field>
          <Field label={t("Password")}>
            <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <Button type="submit" variant="primary" busy={busy} className="mt-1">
            {t("Log in")}
          </Button>
          <p className="text-center text-xs text-ink-3">{t("Only admin accounts can log in here.")}</p>
        </form>
        <div className="mx-auto mt-4 w-40">
          <LanguageSwitch />
        </div>
      </div>
    </main>
  );
}
