import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { QueueItem } from "../files";
import { replaceExt } from "../files";

// Single-threaded UMD build — no COOP/COEP headers required.
const CORE_BASE = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

export function isAudio(file: File) {
  if (file.type.startsWith("audio/")) return true;
  return /\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i.test(file.name);
}

export async function getFFmpeg(onLoadProgress?: (p: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const ff = new FFmpeg();
    onLoadProgress?.(5);
    const [coreURL, wasmURL] = await Promise.all([
      toBlobURL(`${CORE_BASE}/ffmpeg-core.js`, "text/javascript"),
      toBlobURL(`${CORE_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    ]);
    onLoadProgress?.(60);
    await ff.load({ coreURL, wasmURL });
    onLoadProgress?.(100);
    ffmpegInstance = ff;
    return ff;
  })();

  return loadingPromise;
}

const targetExtFor: Record<string, { ext: string; codec: string[] }> = {
  mp3: { ext: "mp3", codec: ["-c:a", "libmp3lame"] },
  m4a: { ext: "m4a", codec: ["-c:a", "aac"] },
  wav: { ext: "wav", codec: ["-c:a", "pcm_s16le"] },
  ogg: { ext: "ogg", codec: ["-c:a", "libvorbis"] },
};

export async function compressAudio(
  item: QueueItem,
  onProgress: (p: number) => void
): Promise<{ blob: Blob; name: string }> {
  const ff = await getFFmpeg((p) => onProgress(p * 0.2)); // first 20% = engine load
  const inputName = `in_${item.id}.${(item.name.split(".").pop() ?? "bin").toLowerCase()}`;

  const targetKey =
    item.targetFormat && item.targetFormat !== "original"
      ? item.targetFormat
      : "mp3";
  const target = targetExtFor[targetKey] ?? targetExtFor.mp3;
  const outName = `out_${item.id}.${target.ext}`;
  const bitrate = item.bitrate ?? 128;

  const progressHandler = ({ progress }: { progress: number }) => {
    const pct = 20 + Math.max(0, Math.min(1, progress)) * 80;
    onProgress(pct);
  };
  ff.on("progress", progressHandler);

  try {
    await ff.writeFile(inputName, await fetchFile(item.file));

    const args = [
      "-i", inputName,
      ...target.codec,
      ...(target.ext === "wav" ? [] : ["-b:a", `${bitrate}k`]),
      outName,
    ];
    await ff.exec(args);

    const data = (await ff.readFile(outName)) as Uint8Array;
    const mime =
      target.ext === "mp3" ? "audio/mpeg"
      : target.ext === "m4a" ? "audio/mp4"
      : target.ext === "wav" ? "audio/wav"
      : "audio/ogg";
    const blob = new Blob([data], { type: mime });

    // cleanup
    try { await ff.deleteFile(inputName); } catch {}
    try { await ff.deleteFile(outName); } catch {}

    return { blob, name: replaceExt(item.name, target.ext) };
  } finally {
    ff.off("progress", progressHandler);
  }
}
