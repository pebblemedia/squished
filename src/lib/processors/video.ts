import { fetchFile } from "@ffmpeg/util";
import type { QueueItem } from "../files";
import { replaceExt } from "../files";
import { getFFmpeg } from "./audio";
import { probeDuration, videoPlanFor, type VideoPlan } from "./media-fit";

export function isVideo(file: File) {
  if (file.type.startsWith("video/")) return true;
  return /\.(mp4|mov|webm|mkv|avi|m4v)$/i.test(file.name);
}

// Map quality slider (0..1) to a CRF value. Lower CRF = higher quality.
// 0.20 → CRF 32 (heavy compression), 1.00 → CRF 18 (visually lossless)
function qualityToCrf(q: number): number {
  const clamped = Math.max(0.2, Math.min(1, q));
  return Math.round(32 - (clamped - 0.2) * (14 / 0.8));
}

const targetFor: Record<
  string,
  { ext: string; videoCodec: string[]; audioCodec: string[]; mime: string }
> = {
  mp4: {
    ext: "mp4",
    videoCodec: ["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-movflags", "+faststart"],
    audioCodec: ["-c:a", "aac", "-b:a", "128k"],
    mime: "video/mp4",
  },
  webm: {
    ext: "webm",
    videoCodec: ["-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8", "-row-mt", "1"],
    audioCodec: ["-c:a", "libopus", "-b:a", "96k"],
    mime: "video/webm",
  },
};

export async function compressVideo(
  item: QueueItem,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  const ff = await getFFmpeg((p) => onProgress(p * 0.1)); // 10% engine load

  const sourceExt = (item.name.split(".").pop() ?? "bin").toLowerCase();
  const inputName = `in_${item.id}.${sourceExt}`;

  const targetKey =
    item.targetFormat === "mp4" || item.targetFormat === "webm"
      ? item.targetFormat
      : "mp4";
  const target = targetFor[targetKey];
  const outName = `out_${item.id}.${target.ext}`;
  const crf = qualityToCrf(item.quality);
  const sameFormat =
    (item.targetFormat === "original" && sourceExt === target.ext) ||
    item.targetFormat === sourceExt;

  // "Fit for": already under the limit in the right format — nothing to do.
  if (item.targetBytes && sameFormat && item.file.size <= item.targetBytes) {
    onProgress(100);
    return { blob: item.file, name: item.name };
  }

  const progressHandler = ({ progress }: { progress: number }) => {
    const pct = 10 + Math.max(0, Math.min(1, progress)) * 90;
    onProgress(pct);
  };

  const encode = async (plan?: VideoPlan) => {
    const rate = plan
      ? [
          "-b:v", `${plan.videoKbps}k`,
          "-maxrate", `${Math.round(plan.videoKbps * 1.3)}k`,
          "-bufsize", `${plan.videoKbps * 2}k`,
          "-vf", `scale=-2:'min(${plan.maxHeight},ih)'`,
        ]
      : ["-crf", String(crf)];
    const audio = plan
      ? [target.audioCodec[0], target.audioCodec[1], "-b:a", `${plan.audioKbps}k`]
      : target.audioCodec;
    await ff.exec(["-i", inputName, ...target.videoCodec, ...rate, ...audio, "-y", outName]);
    const data = (await ff.readFile(outName)) as Uint8Array;
    const buf = data.buffer.slice(
      data.byteOffset,
      data.byteOffset + data.byteLength
    ) as ArrayBuffer;
    return new Blob([buf], { type: target.mime });
  };

  try {
    onProgress(11);
    await ff.writeFile(inputName, await fetchFile(item.file));

    let plan: VideoPlan | undefined;
    if (item.targetBytes) plan = videoPlanFor(item.targetBytes, await probeDuration(ff, inputName));

    ff.on("progress", progressHandler);
    let blob = await encode(plan);
    // Bitrate targeting isn't exact; one corrective pass if we overshot.
    if (plan && item.targetBytes && blob.size > item.targetBytes) {
      const factor = (item.targetBytes / blob.size) * 0.92;
      plan = { ...plan, videoKbps: Math.max(50, Math.floor(plan.videoKbps * factor)) };
      blob = await encode(plan);
    }
    let outputName = replaceExt(item.name, target.ext);

    try { await ff.deleteFile(inputName); } catch { /* ignore */ }
    try { await ff.deleteFile(outName); } catch { /* ignore */ }

    // If we re-encoded into the same format and ended up bigger, keep original.
    if (sameFormat && blob.size > item.file.size) {
      blob = new Blob([await item.file.arrayBuffer()], {
        type: item.file.type || target.mime,
      });
      outputName = item.name;
    }

    return { blob, name: outputName };
  } finally {
    ff.off("progress", progressHandler);
  }
}
