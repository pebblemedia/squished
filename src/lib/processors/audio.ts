import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import type { QueueItem } from "../files";
import { replaceExt } from "../files";
import { audioKbpsFor, probeDuration } from "./media-fit";

// Single-threaded ESM build — served from CDN (the wasm is ~32 MB and
// Lovable's hosting layer times out (524) serving large static assets).
const CORE_VERSION = "0.12.10";
const CORE_BASE = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/esm`;
const CORE_JS = `${CORE_BASE}/ffmpeg-core.js`;
const CORE_WASM = `${CORE_BASE}/ffmpeg-core.wasm`;

let ffmpegInstance: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message || err.name || "Error";
  if (typeof err === "string") return err;
  try { return JSON.stringify(err); } catch { return String(err); }
}

export function isAudio(file: File) {
  if (file.type.startsWith("audio/")) return true;
  return /\.(mp3|wav|m4a|aac|ogg|flac|opus)$/i.test(file.name);
}

// Fetch with real download progress (Content-Length based).
async function fetchWithProgress(
  url: string,
  mime: string,
  onProgress: (loaded: number, total: number) => void
): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  const total = Number(res.headers.get("content-length") ?? 0);
  if (!res.body) {
    const blob = await res.blob();
    return URL.createObjectURL(new Blob([blob], { type: mime }));
  }
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      loaded += value.length;
      onProgress(loaded, total);
    }
  }
  return URL.createObjectURL(new Blob(chunks as BlobPart[], { type: mime }));
}

export async function getFFmpeg(onLoadProgress?: (p: number) => void): Promise<FFmpeg> {
  if (ffmpegInstance) return ffmpegInstance;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const ff = new FFmpeg();
    ff.on("log", ({ message }) => console.log("[ffmpeg]", message));
    onLoadProgress?.(2);

    // Cross-origin module worker imports are blocked, so wrap the core JS in
    // a same-origin blob URL.
    const coreURL = await toBlobURL(CORE_JS, "text/javascript");
    onLoadProgress?.(5);

    // wasm is the big one (~31 MB) — track real progress 5 → 90.
    const wasmURL = await fetchWithProgress(CORE_WASM, "application/wasm", (l, t) => {
      const frac = t > 0 ? l / t : 0;
      onLoadProgress?.(5 + frac * 85);
    });

    onLoadProgress?.(92);
    await ff.load({ coreURL, wasmURL });
    onLoadProgress?.(100);
    ffmpegInstance = ff;
    return ff;
  })();

  try {
    return await loadingPromise;
  } catch (err) {
    loadingPromise = null;
    console.error("[ffmpeg] load failed:", err);
    throw new Error(`Couldn't load audio engine: ${describeError(err)}`);
  }
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
  const mime =
    target.ext === "mp3" ? "audio/mpeg"
    : target.ext === "m4a" ? "audio/mp4"
    : target.ext === "wav" ? "audio/wav"
    : "audio/ogg";
  const sourceExt = (item.name.split(".").pop() ?? "").toLowerCase();
  const sameFormat =
    (item.targetFormat === "original" && sourceExt === target.ext) ||
    item.targetFormat === sourceExt;

  // "Fit for": already under the limit in the right format — nothing to do.
  if (item.targetBytes && sameFormat && item.file.size <= item.targetBytes) {
    onProgress(100);
    return { blob: item.file, name: item.name };
  }

  const progressHandler = ({ progress }: { progress: number }) => {
    const pct = 20 + Math.max(0, Math.min(1, progress)) * 80;
    onProgress(pct);
  };

  const encode = async (bitrate: number) => {
    // Low bitrates require mono + a lower sample rate or the encoder will
    // refuse / produce garbage (libmp3lame minimums depend on sample rate).
    const lowBitrate = bitrate <= 48;
    const veryLow = bitrate <= 24;
    await ff.exec([
      "-i", inputName,
      ...target.codec,
      ...(target.ext === "wav" ? [] : ["-b:a", `${bitrate}k`]),
      ...(lowBitrate ? ["-ac", "1"] : []),
      ...(veryLow ? ["-ar", "22050"] : lowBitrate ? ["-ar", "32000"] : []),
      "-y", outName,
    ]);
    const data = (await ff.readFile(outName)) as Uint8Array;
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    return new Blob([buf], { type: mime });
  };

  try {
    await ff.writeFile(inputName, await fetchFile(item.file));

    let bitrate = item.bitrate ?? 128;
    if (item.targetBytes && target.ext !== "wav") {
      const seconds = await probeDuration(ff, inputName);
      bitrate = Math.max(8, Math.min(192, audioKbpsFor(item.targetBytes, seconds)));
    }

    ff.on("progress", progressHandler);
    let blob = await encode(bitrate);
    if (item.targetBytes && blob.size > item.targetBytes && target.ext !== "wav" && bitrate > 8) {
      bitrate = Math.max(8, Math.floor(bitrate * (item.targetBytes / blob.size) * 0.95));
      blob = await encode(bitrate);
    }
    let outputName = replaceExt(item.name, target.ext);

    // cleanup
    try { await ff.deleteFile(inputName); } catch { /* ignore */ }
    try { await ff.deleteFile(outName); } catch { /* ignore */ }

    // If re-encoding made the file bigger (source was already at a lower
    // bitrate than the chosen target), keep the original — it's smaller and
    // hasn't been re-compressed lossily.
    if (sameFormat && blob.size > item.file.size) {
      console.log("[ffmpeg] output larger than source, keeping original");
      blob = new Blob([await item.file.arrayBuffer()], { type: item.file.type || mime });
      outputName = item.name;
    }

    return { blob, name: outputName };
  } finally {
    ff.off("progress", progressHandler);
  }
}
