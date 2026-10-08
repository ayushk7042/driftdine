import type { QueryClient } from "@tanstack/react-query";
import { adsApi } from "./endpoints";
import type { Ad } from "./types";

export const adDevice = () =>
  typeof window === "undefined" ? "desktop" : window.innerWidth < 640 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop";

export const adsQueryKey = (device = adDevice()) => ["ads", "all", device] as const;
const storeKey = (device: string) => `dd_ads_all_v2:${device}`;

export const readAdsCache = (device = adDevice()): Ad[] | undefined => {
  try { const raw = localStorage.getItem(storeKey(device)); return raw ? (JSON.parse(raw) as Ad[]) : undefined; } catch { return undefined; }
};

/** Every active booking for this device, in one request. */
export async function fetchAllAds(device = adDevice()): Promise<Ad[]> {
  const data = await adsApi.serve({ device } as { position: string; device?: string });
  try { localStorage.setItem(storeKey(device), JSON.stringify(data)); } catch { /* storage unavailable */ }
  return data;
}

/**
 * Called before the app renders. On a first visit we wait (up to `maxWaitMs`) for the bookings so
 * the very first paint already has every slot at its final size; on a repeat visit the last known
 * bookings are used immediately and refreshed in the background.
 */
export async function primeAds(qc: QueryClient, maxWaitMs = 6000) {
  const device = adDevice();
  const cached = readAdsCache(device);
  const load = fetchAllAds(device).then((d) => { qc.setQueryData(adsQueryKey(device), d); }).catch(() => {});
  if (cached) { qc.setQueryData(adsQueryKey(device), cached, { updatedAt: 0 }); return; }
  await Promise.race([load, new Promise((r) => setTimeout(r, maxWaitMs))]);
}
