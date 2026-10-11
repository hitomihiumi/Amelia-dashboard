import "server-only";

import sharp from "sharp";

/** What the upload routes accept; hosts such as Vercel refuse request bodies above ~4.5 MB. */
export const MAX_UPLOAD_BYTES = 4_200_000;

/** Accepted types, checked again on the server by the content of the file. */
export const ACCEPTED_IMAGE_TYPES = "image/png,image/jpeg,image/webp,image/gif";

/**
 * What a stored picture is made to fit.
 * - `cover`: exactly `width`×`height`. The picture is scaled until it covers that size and the
 *   overhanging part is cut off around the centre, so a picture that already has the right width
 *   (or height) loses only the excess of the other side. Small pictures are scaled up.
 * - `inside`: no bigger than `width`×`height`, scaled down with its proportions and never up.
 */
export type ImageTarget = { kind: "cover" | "inside"; width: number; height: number };

export type ProcessedImage =
  | { ok: true; data: Buffer; width: number; height: number; size: number }
  | { ok: false; error: "tooBig" | "notAPicture" };

/**
 * Decodes an uploaded picture and writes it again as WebP at the size it will be drawn at, so it
 * does not take more room than it needs. Re-encoding also means only real pictures are kept (a
 * file that merely claims to be one is refused) and nothing but pixels survives: no scripts, no
 * metadata.
 */
export async function processImage(bytes: Buffer, target: ImageTarget): Promise<ProcessedImage> {
  if (bytes.byteLength > MAX_UPLOAD_BYTES) return { ok: false, error: "tooBig" };

  try {
    const source = sharp(bytes, { limitInputPixels: 50_000_000 });
    const meta = await source.metadata();
    if (!meta.format || !["png", "jpeg", "webp", "gif"].includes(meta.format)) {
      return { ok: false, error: "notAPicture" };
    }

    const resized = source.rotate().resize(
      target.kind === "cover"
        ? { width: target.width, height: target.height, fit: "cover", position: "centre" }
        : {
            width: target.width,
            height: target.height,
            fit: "inside",
            withoutEnlargement: true,
          },
    );
    const { data, info } = await resized
      .webp({ quality: 88 })
      .toBuffer({ resolveWithObject: true });
    return { ok: true, data, width: info.width, height: info.height, size: info.size };
  } catch {
    return { ok: false, error: "notAPicture" };
  }
}
