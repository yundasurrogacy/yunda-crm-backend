const RETURN_KEY = "crm:list-return";

export type ListReturnState = {
  href: string;
  scroll: number;
  savedAt: number;
};

function currentListScroll() {
  if (typeof document === "undefined") return 0;
  const table = document.querySelector(".crm-table-scroll");
  if (table instanceof HTMLElement) return table.scrollTop;
  return document.querySelector("main")?.scrollTop ?? 0;
}

export function rememberListReturn(href: string, scroll?: number) {
  if (typeof window === "undefined") return;
  try {
    const state: ListReturnState = {
      href,
      scroll: scroll ?? currentListScroll(),
      savedAt: Date.now(),
    };
    sessionStorage.setItem(RETURN_KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function readListReturn(): ListReturnState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(RETURN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ListReturnState;
    if (!parsed?.href) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function listHrefForBack(fallback: string): string {
  const remembered = readListReturn();
  if (!remembered?.href) return fallback;
  const rememberedPath = remembered.href.split("?")[0] ?? "";
  const fallbackPath = fallback.split("?")[0] ?? "";
  return rememberedPath === fallbackPath ? remembered.href : fallback;
}

export function restoreMainScroll(href: string): void {
  const remembered = readListReturn();
  if (!remembered) return;
  if ((href.split("?")[0] ?? "") !== (remembered.href.split("?")[0] ?? "")) return;
  const table = document.querySelector(".crm-table-scroll");
  if (table instanceof HTMLElement) {
    table.scrollTop = remembered.scroll;
    return;
  }
  const main = document.querySelector("main");
  if (main) main.scrollTop = remembered.scroll;
}

export function cacheListPayload(cacheKey: string, payload: unknown) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(cacheKey, JSON.stringify({ savedAt: Date.now(), payload }));
  } catch {
    /* ignore */
  }
}

export function readCachedListPayload<T>(cacheKey: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { payload?: T; savedAt?: number };
    if (!parsed?.payload) return null;
    if (parsed.savedAt && Date.now() - parsed.savedAt > 1000 * 60 * 30) return null;
    return parsed.payload;
  } catch {
    return null;
  }
}
