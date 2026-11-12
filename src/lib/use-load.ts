"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "./api";
import { useI18n } from "./i18n";

/**
 * Loads data when `key` changes (and again with reload()). Keeps the last data while a new load runs.
 * `key` names what is loaded, e.g. the date: load() is read fresh on every change of it.
 */
export function useLoad<T>(load: () => Promise<T>, key: string) {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const token = `${key}#${tick}`;
  const [state, setState] = useState<{ token: string; data: T | null; error: string | null }>({ token: "", data: null, error: null });

  useEffect(() => {
    let live = true;
    load().then(
      (data) => live && setState({ token, data, error: null }),
      (e: unknown) => live && setState((s) => ({ token, data: s.data, error: errorText(e, t) })),
    );
    return () => {
      live = false;
    };
    // load and t are new on every render; key + tick say when to load again
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const setData = useCallback((update: T | ((prev: T | null) => T)) => {
    setState((s) => ({ ...s, data: typeof update === "function" ? (update as (p: T | null) => T)(s.data) : update }));
  }, []);

  return {
    data: state.data,
    error: state.token === token ? state.error : null,
    loading: state.token !== token,
    setData,
    reload: () => setTick((n) => n + 1),
  };
}

/** A message to show for a failed call. */
export function errorText(e: unknown, t: (s: string) => string): string {
  if (e instanceof ApiError && e.message === "NETWORK") return t("Can't reach the server");
  return e instanceof Error ? e.message : t("Something went wrong");
}
