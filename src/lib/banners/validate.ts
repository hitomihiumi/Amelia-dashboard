import { isLinkOrPlaceholder } from "@/lib/levels/message";
import { BANNER_LIMITS } from "@/lib/db/types";

export interface BannerProblem {
  key: string;
  params?: Record<string, string | number>;
}

function linkProblem(value: unknown): boolean {
  return (
    typeof value === "string" &&
    value.trim() !== "" &&
    !(
      value.length <= BANNER_LIMITS.url &&
      (/^https:\/\/\S+$/i.test(value.trim()) || isLinkOrPlaceholder(value.trim()))
    )
  );
}

/**
 * Why a payload cannot be saved, or null when it is fine. Checked on the raw payload, before it is
 * normalised, because normalising silently cuts too many banners and layers instead of refusing.
 */
export function bannerProblem(raw: unknown): BannerProblem | null {
  const source = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const items = Array.isArray(source.items) ? source.items : [];

  if (items.length > BANNER_LIMITS.items) {
    return { key: "tooManyBanners", params: { max: BANNER_LIMITS.items } };
  }

  const ids = new Set<string>();
  for (const item of items as Array<Record<string, any>>) {
    if (!item || typeof item.id !== "string" || !item.id || ids.has(item.id))
      return { key: "bannerId" };
    ids.add(item.id);

    const name = typeof item.name === "string" ? item.name : "";
    if (!name.trim()) return { key: "bannerName" };

    const layers = Array.isArray(item.layers) ? item.layers : [];
    if (layers.length > BANNER_LIMITS.layers) {
      return { key: "tooManyLayers", params: { banner: name, max: BANNER_LIMITS.layers } };
    }

    if (item.background?.type === "image" && linkProblem(item.background.src)) {
      return { key: "invalidLink", params: { banner: name } };
    }
    const layerIds = new Set<string>();
    for (const layer of layers as Array<Record<string, any>>) {
      if (!layer || typeof layer.id !== "string" || !layer.id || layerIds.has(layer.id)) {
        return { key: "layerId", params: { banner: name } };
      }
      layerIds.add(layer.id);
      if (layer.type === "image" && linkProblem(layer.src)) {
        return { key: "invalidLink", params: { banner: name } };
      }
      if (
        layer.type === "text" &&
        typeof layer.text === "string" &&
        layer.text.length > BANNER_LIMITS.text
      ) {
        return { key: "textTooLong", params: { banner: name, max: BANNER_LIMITS.text } };
      }
    }
  }

  if (source.enabled === true && !(typeof source.active === "string" && ids.has(source.active))) {
    return { key: "activeRequired" };
  }
  if (typeof source.active === "string" && !ids.has(source.active)) return { key: "activeMissing" };

  const interval = Number(source.interval);
  if (
    !Number.isFinite(interval) ||
    interval < BANNER_LIMITS.minInterval ||
    interval > BANNER_LIMITS.maxInterval
  ) {
    return {
      key: "interval",
      params: { min: BANNER_LIMITS.minInterval, max: BANNER_LIMITS.maxInterval },
    };
  }
  if (source.activity_window !== 60 && source.activity_window !== 120)
    return { key: "activityWindow" };

  return null;
}
