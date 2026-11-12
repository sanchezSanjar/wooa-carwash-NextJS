import type {
  AdminSubscription,
  Car,
  DaySheet,
  DayPlanItem,
  Extra,
  Invoice,
  InvoiceMonth,
  InvoiceStatus,
  PaymentMethod,
  ReviewItem,
  Role,
  SheetCandidate,
  SheetImportPreview,
  StaffMember,
  Tariff,
  User,
  WashDetail,
  WashStatus,
} from "./types";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Everything goes through this site's /api/proxy, which adds the login from the httpOnly cookie. */
export const proxied = (path: string) => `/api/proxy${path}`;

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const isForm = body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(proxied(path), {
      method,
      headers: body && !isForm ? { "Content-Type": "application/json" } : undefined,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new ApiError("NETWORK", 0);
  }
  if (res.status === 401) {
    // the login ended: a full page load to the login page also drops everything loaded so far
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
    throw new ApiError("Please log in again", 401);
  }
  if (res.status === 204) return undefined as T;
  const data = (await res.json().catch(() => undefined)) as { message?: string | string[] } | undefined;
  if (!res.ok) {
    const raw = data?.message;
    const message = Array.isArray(raw) ? raw[0] : raw;
    throw new ApiError(message ?? `Request failed (${res.status})`, res.status);
  }
  return data as T;
}

const q = (params: Record<string, string | undefined>) => {
  const s = new URLSearchParams(Object.entries(params).filter((e): e is [string, string] => !!e[1])).toString();
  return s ? `?${s}` : "";
};

export const api = {
  me: () => request<User>("GET", "/auth/me"),

  // day sheet and washes
  dayPlan: (date: string) => request<DayPlanItem[]>("GET", `/washes${q({ date })}`),
  daySheet: (date: string) => request<DaySheet>("GET", `/daysheets/${date}`),
  saveDaySheet: (date: string, rows: { subscriptionId: string; scheduledDate: string; washerId?: string; note?: string }[]) =>
    request<DaySheet>("PUT", `/daysheets/${date}`, { rows }),
  moveWash: (date: string, body: { subscriptionId: string; scheduledDate: string; toDate: string }) =>
    request<{ from: DaySheet; to: DaySheet }>("POST", `/daysheets/${date}/move`, body),
  sheetCandidates: (date: string) => request<SheetCandidate[]>("GET", `/daysheets/${date}/candidates`),
  sheetStaff: () => request<StaffMember[]>("GET", "/daysheets/staff"),
  setWashStatus: (body: { subscriptionId: string; date: string; status: WashStatus; note?: string; washedOn?: string }) =>
    request<{ status: WashStatus }>("PATCH", "/washes", body),
  washDetail: (subscriptionId: string, date: string) => request<WashDetail>("GET", `/washes/detail${q({ subscriptionId, date })}`),
  exportUrl: (from: string, days: number) => proxied(`/daysheets/export${q({ from, days: String(days) })}`),
  previewImport: (file: File) => {
    const form = new FormData();
    form.append("file", file, file.name);
    return request<SheetImportPreview>("POST", "/daysheets/import/preview", form);
  },
  applyImport: (plan: SheetImportPreview["plan"]) => request<{ saved: string[] }>("POST", "/daysheets/import/apply", { plan }),

  // bills
  invoices: (month: string, status?: InvoiceStatus) => request<InvoiceMonth>("GET", `/invoices${q({ month, status })}`),
  overdueInvoices: () => request<Invoice[]>("GET", "/invoices/overdue"),
  setInvoiceStatus: (id: string, body: { status: InvoiceStatus; method?: PaymentMethod; note?: string }) =>
    request<Invoice>("PATCH", `/invoices/${id}`, body),

  // members and cars
  members: (search?: string, role?: Role) => request<User[]>("GET", `/members${q({ search, role })}`),
  member: (id: string) => request<User>("GET", `/members/${id}`),
  createMember: (body: { name: string; phone: string; apartmentName: string; role: Role; email?: string; language?: "ko" | "en" }) =>
    request<User>("POST", "/members", body),
  updateMember: (id: string, body: Partial<Pick<User, "name" | "phone" | "apartmentName" | "role" | "status">> & { email?: string }) =>
    request<User>("PATCH", `/members/${id}`, body),
  carsForMember: (ownerId: string) => request<Car[]>("GET", `/cars${q({ ownerId })}`),
  subscriptions: () => request<AdminSubscription[]>("GET", "/subscriptions"),

  // prices
  allTariffs: () => request<Tariff[]>("GET", "/admin/tariffs"),
  allExtras: () => request<Extra[]>("GET", "/admin/extras"),
  updateTariff: (id: string, body: Partial<Pick<Tariff, "price" | "active">>) => request<Tariff>("PATCH", `/tariffs/${id}`, body),
  updateExtra: (id: string, body: Partial<Pick<Extra, "price" | "active">>) => request<Extra>("PATCH", `/extras/${id}`, body),

  // reviews
  reviews: () => request<ReviewItem[]>("GET", "/washes/reviews"),
};
