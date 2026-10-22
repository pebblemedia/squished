export type FileStatus = "queued" | "processing" | "done" | "error";

export type FileKind = "image" | "audio" | "video" | "pdf" | "other";

export type TargetFormat =
  | "jpeg" | "png" | "webp"
  | "mp3" | "m4a" | "wav" | "ogg"
  | "mp4" | "webm"
  | "pdf" | "pdf-to-jpg" | "pdf-to-png"
  | "original";

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  kind: FileKind;
  originalSize: number;
  status: FileStatus;
  progress: number;
  error?: string;
  output?: Blob;
  outputName?: string;
  outputSize?: number;
  targetFormat: TargetFormat;
  quality: number;
  bitrate?: number;
  thumbnail?: string;
  customName?: string;
  meta?: import("./metadata").ImageMeta;
}

export const isImage = (file: File) => file.type.startsWith("image/");

export function detectKind(file: File): FileKind {
  if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (/\.(heic|heif)$/i.test(file.name)) return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (/\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name)) return "video";
  if (/\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i.test(file.name)) return "audio";
  return "other";
}

export function isHeic(file: File): boolean {
  return (
    /\.(heic|heif)$/i.test(file.name) ||
    file.type === "image/heic" ||
    file.type === "image/heif"
  );
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

export function replaceExt(name: string, ext: string): string {
  const dot = name.lastIndexOf(".");
  const base = dot === -1 ? name : name.slice(0, dot);
  return `${base}.${ext}`;
}
