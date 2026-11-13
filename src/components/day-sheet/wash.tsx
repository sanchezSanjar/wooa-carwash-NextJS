"use client";

import { useState } from "react";
import { Stars, WashBadge } from "@/components/status";
import { Banner, Modal, Spinner } from "@/components/ui";
import { api, proxied } from "@/lib/api";
import { useI18n } from "@/lib/i18n";
import type { WashPhoto } from "@/lib/types";
import { useLoad } from "@/lib/use-load";

/** One wash: result, photos before and after, and the member's rating. */
export function WashModal({ subscriptionId, date, onClose }: { subscriptionId: string; date: string; onClose: () => void }) {
  const { t, fmt } = useI18n();
  const { data, error, loading } = useLoad(() => api.washDetail(subscriptionId, date), `${subscriptionId}|${date}`);
  const [big, setBig] = useState<WashPhoto | null>(null);

  const section = (kind: "before" | "after", title: string) => {
    const photos = data?.photos.filter((p) => p.kind === kind) ?? [];
    return (
      <div>
        <p className="mb-2 font-medium">{title}</p>
        {photos.length === 0 ? (
          <p className="text-[13px] text-ink-3">{t("No photos yet.")}</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <button key={p.id} onClick={() => setBig(p)} className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line bg-soft cursor-pointer">
                {/* signed link from the API, loaded through this site's proxy */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={proxied(p.url)} alt={p.note || title} className="size-full object-cover" loading="lazy" />
                {p.note ? <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[11px] text-white">{p.note}</span> : null}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Modal title={data?.car ? `${data.car.plateNumber} · ${fmt.day(date)}` : fmt.day(date)} onClose={onClose} wide>
      {error ? <Banner>{error}</Banner> : null}
      {loading && !data ? <Spinner /> : null}
      {data ? (
        <div className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2 text-[13px]">
            <WashBadge status={data.status} />
            <span className="text-ink-2">
              {fmt.name(data.tariffName)}
              {data.extras.length ? ` + ${data.extras.map(fmt.name).join(", ")}` : ""}
            </span>
            {data.washedOn && data.washedOn !== date ? <span className="text-ink-2">· {t("washed on {date}", { date: fmt.day(data.washedOn) })}</span> : null}
            {data.note ? <span className="text-ink-2">· {data.note}</span> : null}
          </div>
          {section("before", t("Before the wash"))}
          {section("after", t("After the wash"))}
          <div>
            <p className="mb-1 font-medium">{t("Member rating")}</p>
            {data.review ? (
              <p>
                <Stars rating={data.review.rating} /> <span className="text-ink-2">{data.review.comment}</span>
              </p>
            ) : (
              <p className="text-[13px] text-ink-3">{t("Not rated yet.")}</p>
            )}
          </div>
        </div>
      ) : null}
      {big ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-6" onClick={() => setBig(null)} role="dialog" aria-label={t("Photo")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={proxied(big.url)} alt={big.note || ""} className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      ) : null}
    </Modal>
  );
}
