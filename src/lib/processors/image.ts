import imageCompression from "browser-image-compression";
import type { QueueItem, TargetFormat } from "../files";
import { isHeic, replaceExt } from "../files";
import { stripMetadata } from "../strip-metadata";
import { encodeInWorker } from "./image-pool";
import type { EncodeTarget } from "./image-worker";

const mimeFor: Record<EncodeTarget, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};

const extFor: Record<EncodeTarget, string> = {
  jpeg: "jpg",
  png: "png",
  webp: "webp",
  avif: "avif",
};

const targetForMime = (mime: string): EncodeTarget | undefined =>
  (Object.keys(mimeFor) as EncodeTarget[]).find((t) => mimeFor[t] === mime);

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
  const heic = isHeic(item.file);
  let source: File = item.file;
  if (heic) {
    onProgress(5);
    // Decode losslessly so the final encode is the only lossy step.
    source = await decodeHeic(item.file, "image/png", 1);
  }

  if (item.targetFormat === "strip") {
    if (heic) return encodeOrFallback(item, source, "jpeg", Math.max(item.quality, 0.92), onProgress);
    const cleaned = await stripMetadata(source);
    if (!cleaned) throw new Error("This format can't be cleaned without converting. Pick JPEG, PNG or WebP instead.");
    onProgress(100);
    return { blob: cleaned, name: item.name };
  }

  // HEIC can't be written by browsers, so "keep format" falls back to JPEG.
  const target: EncodeTarget | undefined =
    item.targetFormat === "original"
      ? heic ? "jpeg" : targetForMime(source.type)
      : (item.targetFormat as EncodeTarget);

  if (!target) return legacyCompress(item, source, item.targetFormat, onProgress);
  if (target === "png") return compressPng(item, source, onProgress);
  return encodeOrFallback(item, source, target, item.quality, onProgress);
}

async function encodeOrFallback(
  item: QueueItem,
  source: File,
  target: EncodeTarget,
  quality: number,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  try {
    const { buffer, resized } = await encodeInWorker(source, target, quality, onProgress);
    let blob = new Blob([buffer], { type: mimeFor[target] });
    // Never hand back a bigger file when the format is unchanged — just clean the original.
    if (!resized && source.type === mimeFor[target] && blob.size >= source.size) {
      const cleaned = await stripMetadata(source);
      if (cleaned && cleaned.size < blob.size) blob = cleaned;
    }
    return { blob, name: replaceExt(item.name, extFor[target]) };
  } catch (err) {
    console.warn("[squished] fast image engine unavailable, using fallback:", err);
    return legacyCompress(item, source, target, onProgress);
  }
}

/** Lossy colour reduction (existing engine) followed by lossless OxiPNG; keeps the smaller. */
async function compressPng(
  item: QueueItem,
  source: File,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  const reduced = await legacyCompress(item, source, "png", (p) => onProgress(p * 0.6));
  try {
    const { buffer } = await encodeInWorker(reduced.blob, "png-optimise", item.quality, () => onProgress(80));
    if (buffer.byteLength < reduced.blob.size) return { ...reduced, blob: new Blob([buffer], { type: "image/png" }) };
  } catch (err) {
    console.warn("[squished] PNG optimiser unavailable:", err);
  }
  return reduced;
}

/** Original canvas-based path, kept as a fallback for older browsers and odd formats. */
async function legacyCompress(
  item: QueueItem,
  source: File,
  target: TargetFormat,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  if (target === "avif") throw new Error("AVIF needs a newer browser. Try WebP instead.");
  const effective = target === "original" && isHeic(item.file) ? "jpeg" : target;
  const targetMime = effective === "original" ? source.type : mimeFor[effective as EncodeTarget];

  const result = await imageCompression(source, {
    maxSizeMB: 50,
    maxWidthOrHeight: 4096,
    useWebWorker: true,
    fileType: targetMime,
    initialQuality: item.quality,
    onProgress: (p: number) => onProgress(Math.max(0, Math.min(100, p))),
  });

  const ext =
    effective === "original"
      ? (source.name.split(".").pop() ?? "img")
      : extFor[effective as EncodeTarget];

  return { blob: result, name: replaceExt(item.name, ext) };
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
