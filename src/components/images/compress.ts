import Compressor from "compressorjs";

/** The longer side a picture is scaled down to in the browser before it is sent. */
const SEND_MAX_SIDE = 2048;

/**
 * Makes a big picture small enough to send (hosts refuse request bodies of more than a few MB).
 * The proportions are kept; the server then cuts the picture to the exact size it needs. Small
 * files go as they are.
 */
export async function shrinkForUpload(file: File, maxBytes: number): Promise<Blob | null> {
  if (file.size <= maxBytes) return file;

  const smaller = await new Promise<Blob>((resolve, reject) => {
    new Compressor(file, {
      quality: 0.85,
      maxWidth: SEND_MAX_SIDE,
      maxHeight: SEND_MAX_SIDE,
      // A big PNG would stay big; as a JPEG it fits.
      convertSize: 1_000_000,
      success: resolve,
      error: reject,
    });
  }).catch(() => null);

  return smaller && smaller.size <= maxBytes ? smaller : null;
}
