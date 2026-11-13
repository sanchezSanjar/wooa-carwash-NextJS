"use client";

import { useEffect, useState } from "react";
import { MemberModal } from "@/components/members/member";
import { NewMemberModal } from "@/components/members/new-member";
import { Badge, Banner, Button, Card, Empty, Input, PageHeader, Select, Spinner, Table } from "@/components/ui";
import { api } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { Role, User } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

const ROLE_LABEL: Record<Role, string> = { customer: "Customer", washer: "Washer", admin: "Admin" };

/** Customers, washers and admins: find a member, add one, change role, block, see their cars. */
export default function MembersPage() {
  const { t, fmt } = useI18n();
  const [typed, setTyped] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<Role | "">("");
  const [adding, setAdding] = useState(false);
  const [open, setOpen] = useState<User | null>(null);

  // search a moment after typing stops
  useEffect(() => {
    const id = setTimeout(() => setSearch(typed.trim()), 300);
    return () => clearTimeout(id);
  }, [typed]);

  const { data, error, loading, setData } = useLoad(() => api.members(search || undefined, role || undefined), `${search}|${role}`);
  const replace = (u: User) => setData((list) => (list ?? []).map((m) => (m.id === u.id ? u : m)));

  return (
    <>
      <PageHeader
        title={t("Members")}
        sub={data ? t("{n} shown", { n: data.length }) : undefined}
        actions={
          <Button variant="primary" onClick={() => setAdding(true)}>
            + {t("Add member")}
          </Button>
        }
      />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-3">
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={t("Name, phone or apartment")} className="h-8 !w-72" aria-label={t("Search")} />
          <Select value={role} onChange={(e) => setRole(e.target.value as Role | "")} className="h-8 text-[13px]" aria-label={t("Role")}>
            <option value="">{t("All roles")}</option>
            {(Object.keys(ROLE_LABEL) as Role[]).map((r) => (
              <option key={r} value={r}>
                {t(ROLE_LABEL[r])}
              </option>
            ))}
          </Select>
          {loading && data ? <span className="text-[13px] text-ink-3">{t("Loading…")}</span> : null}
        </div>
        {error ? <div className="p-4"><Banner>{error}</Banner></div> : null}
        {!data && loading ? <Spinner /> : null}
        {data && data.length === 0 ? <Empty title={t("No members found.")} /> : null}
        {data?.length ? (
          <Table head={[t("Name"), t("Mobile number"), t("Apartment"), t("Role"), t("Status"), t("Texts in")]}>
            {data.map((m) => (
              <tr key={m.id} onClick={() => setOpen(m)} className="cursor-pointer hover:bg-soft">
                <td className="font-medium">{m.name}</td>
                <td className="whitespace-nowrap">{fmt.phone(m.phone)}</td>
                <td>{m.apartmentName}</td>
                <td>{m.role === "customer" ? <span className="text-ink-2">{t("Customer")}</span> : <Badge tone="info">{t(ROLE_LABEL[m.role])}</Badge>}</td>
                <td className="whitespace-nowrap">
                  {m.status === "blocked" ? <Badge tone="bad">{t("Blocked")}</Badge> : <Badge tone="ok">{t("Active")}</Badge>}
                  {m.hasPassword === false ? <span className="ml-1"><Badge tone="warn">{t("No password yet")}</Badge></span> : null}
                </td>
                <td className="text-ink-2">{m.language === "en" ? "English" : "한국어"}</td>
              </tr>
            ))}
          </Table>
        ) : null}
        {data && data.length >= 200 ? <p className="border-t border-line px-4 py-2 text-[13px] text-ink-3">{t("Showing the newest 200. Search to find others.")}</p> : null}
      </Card>

      {adding ? (
        <NewMemberModal
          onClose={() => setAdding(false)}
          onCreated={(u) => {
            setAdding(false);
            setData((list) => [u, ...(list ?? [])]);
            setOpen(u);
          }}
        />
      ) : null}
      {open ? <MemberModal member={open} onClose={() => setOpen(null)} onChange={(u) => (replace(u), setOpen(u))} /> : null}
    </>
  );
}
