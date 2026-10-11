/**
 * Pictures a server owner uploads for banners. A banner points at one as `upload:<id>`; the bot
 * reads it from the database and the editor loads it from the image route of the dashboard.
 */

export const BANNER_IMAGE_LIMITS = {
  /** What the upload route accepts. Hosts such as Vercel refuse request bodies above ~4.5 MB. */
  maxBytes: 4_200_000,
  /** Pictures kept per server. */
  maxCount: 20,
  /** The longer side the picture is scaled down to when it is stored. */
  maxSide: 2048,
  /** Accepted types, checked again on the server by the content of the file. */
  accept: "image/png,image/jpeg,image/webp,image/gif",
} as const;

export interface BannerImageInfo {
  id: string;
  name: string;
  size: number;
  width: number;
  height: number;
}

const UPLOAD = /^upload:([A-Za-z0-9_-]{10,40})$/;

export const uploadRef = (id: string) => `upload:${id}`;

/** The id of an uploaded picture, or null when the link is something else. */
export function uploadId(link: string | null | undefined): string | null {
  const match = link ? UPLOAD.exec(link.trim()) : null;
  return match ? match[1] : null;
}

/** Where the editor loads an uploaded picture from. */
export const uploadUrl = (guildId: string, id: string) =>
  `/api/dashboard/${guildId}/banner-images/${id}`;

/** The ids of the uploads a banner uses, in its background and its picture layers. */
export function usedUploads(
  banners: Array<{
    background: { type: string; src?: string };
    layers: Array<{ type: string; src?: string }>;
  }>,
): Set<string> {
  const used = new Set<string>();
  for (const banner of banners) {
    const background = banner.background.type === "image" ? uploadId(banner.background.src) : null;
    if (background) used.add(background);
    for (const layer of banner.layers) {
      const id = layer.type === "image" ? uploadId(layer.src) : null;
      if (id) used.add(id);
    }
  }
  return used;
}
