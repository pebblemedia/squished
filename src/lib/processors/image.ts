import imageCompression from "browser-image-compression";
import type { QueueItem, TargetFormat } from "../files";
import { replaceExt } from "../files";

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

export async function compressImage(
  item: QueueItem,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  const targetMime =
    item.targetFormat === "original" ? item.file.type : mimeFor[item.targetFormat];

  const result = await imageCompression(item.file, {
    maxSizeMB: 50,
    maxWidthOrHeight: 4096,
    useWebWorker: true,
    fileType: targetMime,
    initialQuality: item.quality,
    onProgress: (p: number) => onProgress(Math.max(0, Math.min(100, p))),
  });

  const ext =
    item.targetFormat === "original"
      ? (item.name.split(".").pop() ?? "img")
      : extFor[item.targetFormat];

  return { blob: result, name: replaceExt(item.name, ext) };
}

export async function makeThumbnail(file: File): Promise<string | undefined> {
  if (!file.type.startsWith("image/")) return undefined;
  try {
    const small = await imageCompression(file, {
      maxSizeMB: 0.05,
      maxWidthOrHeight: 200,
      useWebWorker: true,
      fileType: "image/jpeg",
      initialQuality: 0.7,
    });
    return URL.createObjectURL(small);
  } catch {
    return URL.createObjectURL(file);
  }
}
