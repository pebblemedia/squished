import imageCompression from "browser-image-compression";
import type { QueueItem, TargetFormat } from "../files";
import { isHeic, replaceExt } from "../files";

const mimeFor: Partial<Record<Exclude<TargetFormat, "original">, string>> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const extFor: Partial<Record<Exclude<TargetFormat, "original">, string>> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
};

async function decodeHeic(file: File, toMime: "image/jpeg" | "image/png", quality: number): Promise<File> {
  const { heicTo } = await import("heic-to");
  const blob = await heicTo({
    blob: file,
    type: toMime,
    quality,
  });
  const ext = toMime === "image/png" ? "png" : "jpg";
  return new File([blob], replaceExt(file.name, ext), { type: toMime });
}

export async function compressImage(
  item: QueueItem,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  // HEIC needs to be decoded first because the browser can't render it.
  let source: File = item.file;
  if (isHeic(item.file)) {
    onProgress(5);
    // If the user wants PNG, decode to PNG to preserve quality. Otherwise decode to JPEG.
    const decodeMime = item.targetFormat === "png" ? "image/png" : "image/jpeg";
    source = await decodeHeic(item.file, decodeMime, Math.max(item.quality, 0.92));
  }

  // If target is "original" and the source is HEIC, fall back to JPEG (browsers can't write HEIC).
  const effectiveTarget: TargetFormat =
    item.targetFormat === "original" && isHeic(item.file) ? "jpeg" : item.targetFormat;

  const targetMime =
    effectiveTarget === "original" ? source.type : mimeFor[effectiveTarget];

  const result = await imageCompression(source, {
    maxSizeMB: 50,
    maxWidthOrHeight: 4096,
    useWebWorker: true,
    fileType: targetMime,
    initialQuality: item.quality,
    onProgress: (p: number) => onProgress(Math.max(0, Math.min(100, p))),
  });

  const ext =
    effectiveTarget === "original"
      ? (source.name.split(".").pop() ?? "img")
      : extFor[effectiveTarget];

  return { blob: result, name: replaceExt(item.name, ext!) };
}

export async function makeThumbnail(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/") && !isHeic(file)) return undefined;
  try {
    const source = isHeic(file)
      ? await (async () => {
          const { heicTo } = await import("heic-to");
          const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.7 });
          return new File([blob], replaceExt(file.name, "jpg"), { type: "image/jpeg" });
        })()
      : file;
    const small = await imageCompression(source, {
      maxSizeMB: 0.05,
      maxWidthOrHeight: 200,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.7,
    });
    return URL.createObjectURL(small);
  } catch {
    try {
      return URL.createObjectURL(file);
    } catch {
      return undefined;
    }
  }
}
