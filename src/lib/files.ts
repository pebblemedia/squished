export type FileStatus = "queued" | "processing" | "done" | "error";

export type TargetFormat = "jpeg" | "png" | "webp" | "original";

export interface QueueItem {
  id: string;
  file: File;
  name: string;
  originalSize: number;
  status: FileStatus;
  progress: number;
  error?: string;
  output?: Blob;
  outputName?: string;
  outputSize?: number;
  targetFormat: TargetFormat;
  quality: number; // 0..1
  thumbnail?: string;
}

export const isImage = (file: File) => file.type.startsWith("image/");

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
