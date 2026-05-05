import type { TargetFormat } from "./files";

export type ToolCategory = "audio" | "video" | "image";
export type ToolKind = "compress" | "convert";

export interface FaqEntry {
  q: string;
  a: string;
}

export interface Tool {
  slug: string;
  kind: ToolKind;
  category: ToolCategory;
  /** Lowercase extensions accepted for input (no dots). */
  inputExt: string[];
  /** Format the queue item should default to. */
  targetFormat: TargetFormat;
  /** Short label used in nav/grids, e.g. "Compress MP3". */
  label: string;
  /** SEO <title>. */
  title: string;
  /** Page H1. */
  h1: string;
  /** SEO meta description (<160 chars). */
  description: string;
  /** Lead paragraph under H1. */
  intro: string;
  /** 4–6 FAQ entries. */
  faq: FaqEntry[];
  /** Slugs of related tools (for internal linking). */
  related: string[];
}

const PRIVACY_FAQ: FaqEntry = {
  q: "Are my files uploaded anywhere?",
  a: "No. Squished runs entirely in your browser using WebAssembly. Your files never leave your device — there's no server to upload to.",
};

const FREE_FAQ: FaqEntry = {
  q: "Is it really free?",
  a: "Yes. There are no accounts, quotas, or watermarks. You can compress and convert as many files as you like.",
};

const SIZE_FAQ: FaqEntry = {
  q: "Is there a file size limit?",
  a: "There's no hard limit, but very large files (multi-GB videos) may be slow because everything runs on your device. For most images, audio, and short videos, processing takes a few seconds.",
};

const accept = (exts: string[]) =>
  exts.map((e) => `.${e}`).join(",");

function audioCompress(
  ext: string,
  formatLabel: string,
  targetFormat: TargetFormat,
  related: string[]
): Tool {
  return {
    slug: `compress-${ext}`,
    kind: "compress",
    category: "audio",
    inputExt: [ext],
    targetFormat,
    label: `Compress ${formatLabel}`,
    title: `Compress ${formatLabel} Online — Free, Private, In Your Browser | Squished`,
    h1: `Compress ${formatLabel} files in your browser`,
    description: `Shrink ${formatLabel} files up to 80% without uploading. Free, private, and runs entirely on your device — no signup, no waiting.`,
    intro: `Make ${formatLabel} files smaller for email, web, or storage. Pick a target bitrate and Squished re-encodes the audio locally — your files never leave your device.`,
    faq: [
      PRIVACY_FAQ,
      {
        q: `What bitrate should I choose for ${formatLabel}?`,
        a: `For voice and podcasts, 64–96 kbps is plenty. For music, 128 kbps is a good balance, and 192–256 kbps is near-transparent. Lower bitrates produce smaller files at the cost of audio quality.`,
      },
      {
        q: `Will compressing ${formatLabel} reduce quality?`,
        a: `${formatLabel} is a lossy format, so re-encoding always loses a bit of quality. Squished picks safe defaults and skips re-encoding if the result would be larger than the original.`,
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related,
  };
}

function audioConvert(
  fromExt: string,
  toExt: string,
  fromLabel: string,
  toLabel: string,
  targetFormat: TargetFormat,
  related: string[]
): Tool {
  return {
    slug: `convert-${fromExt}-to-${toExt}`,
    kind: "convert",
    category: "audio",
    inputExt: [fromExt],
    targetFormat,
    label: `${fromLabel} to ${toLabel}`,
    title: `Convert ${fromLabel} to ${toLabel} Online — Free & Private | Squished`,
    h1: `Convert ${fromLabel} to ${toLabel} in your browser`,
    description: `Convert ${fromLabel} files to ${toLabel} instantly. Free, no upload, no signup — runs entirely on your device.`,
    intro: `Turn ${fromLabel} audio into ${toLabel} without uploading anything. Squished re-encodes the file locally with WebAssembly and gives you a clean ${toLabel} download in seconds.`,
    faq: [
      PRIVACY_FAQ,
      {
        q: `Why convert ${fromLabel} to ${toLabel}?`,
        a: `${toLabel} is widely supported and ${
          toExt === "mp3"
            ? "works in nearly every player and browser"
            : toExt === "m4a"
            ? "offers better quality at smaller sizes than MP3"
            : toExt === "wav"
            ? "is uncompressed and ideal for editing or archival"
            : "is an open, royalty-free format"
        }.`,
      },
      {
        q: `Does conversion lose quality?`,
        a:
          toExt === "wav"
            ? `Converting to WAV is lossless from the source — but the file gets much larger.`
            : `Lossy-to-lossy conversions (like ${fromLabel} → ${toLabel}) lose a small amount of quality. Pick a higher bitrate for better fidelity.`,
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related,
  };
}

function videoCompress(
  ext: string,
  formatLabel: string,
  targetFormat: TargetFormat,
  related: string[]
): Tool {
  return {
    slug: `compress-${ext}`,
    kind: "compress",
    category: "video",
    inputExt: [ext],
    targetFormat,
    label: `Compress ${formatLabel}`,
    title: `Compress ${formatLabel} Online — Free, Private, In Your Browser | Squished`,
    h1: `Compress ${formatLabel} videos in your browser`,
    description: `Shrink ${formatLabel} videos for sharing, email, or the web. 100% private — files never leave your device.`,
    intro: `Drop a ${formatLabel} video and Squished re-encodes it locally with H.264/VP9 to a target quality you choose. No uploads, no servers, no waiting in line.`,
    faq: [
      PRIVACY_FAQ,
      {
        q: `How much smaller will my ${formatLabel} get?`,
        a: `It depends on the source. Phone-recorded ${formatLabel} files often shrink 60–80% at quality 60. Already-compressed web videos shrink less.`,
      },
      {
        q: `Why is compression slow for big videos?`,
        a: `ffmpeg.wasm is single-threaded in the browser, so 4K videos take a while. Drop the quality slider to ~50 for faster results, or trim the video first.`,
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related,
  };
}

function videoConvert(
  fromExt: string,
  toExt: string,
  fromLabel: string,
  toLabel: string,
  targetFormat: TargetFormat,
  related: string[]
): Tool {
  return {
    slug: `convert-${fromExt}-to-${toExt}`,
    kind: "convert",
    category: "video",
    inputExt: [fromExt],
    targetFormat,
    label: `${fromLabel} to ${toLabel}`,
    title: `Convert ${fromLabel} to ${toLabel} Online — Free & Private | Squished`,
    h1: `Convert ${fromLabel} to ${toLabel} in your browser`,
    description: `Convert ${fromLabel} videos to ${toLabel} locally. Free, no upload, no signup — your files stay on your device.`,
    intro: `Drop a ${fromLabel} file and Squished re-encodes it to ${toLabel} entirely in your browser. No accounts, no upload limits.`,
    faq: [
      PRIVACY_FAQ,
      {
        q: `${fromLabel} vs ${toLabel} — which should I use?`,
        a:
          toExt === "mp4"
            ? `MP4 (H.264) is the most compatible video format — it plays everywhere from phones to TVs.`
            : `WebM (VP9) is an open, royalty-free format that's ideal for the web and often produces smaller files at the same quality.`,
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related,
  };
}

function imageCompress(
  ext: string,
  formatLabel: string,
  targetFormat: TargetFormat,
  related: string[]
): Tool {
  return {
    slug: `compress-${ext}`,
    kind: "compress",
    category: "image",
    inputExt: ext === "jpg" ? ["jpg", "jpeg"] : [ext],
    targetFormat,
    label: `Compress ${formatLabel}`,
    title: `Compress ${formatLabel} Online — Free, Private, In Your Browser | Squished`,
    h1: `Compress ${formatLabel} images in your browser`,
    description: `Shrink ${formatLabel} images without uploading. Free, instant, and 100% private — runs entirely on your device.`,
    intro: `Drop ${formatLabel} files and Squished compresses them locally. Adjust quality with a slider and download — nothing is uploaded to a server.`,
    faq: [
      PRIVACY_FAQ,
      {
        q: `What quality setting should I use?`,
        a: `For web use, 70–80 keeps images sharp at a fraction of the size. For thumbnails or previews, 50–60 works well. 100 keeps the original quality but barely shrinks the file.`,
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related,
  };
}

function imageConvert(
  fromExt: string,
  toExt: string,
  fromLabel: string,
  toLabel: string,
  targetFormat: TargetFormat,
  related: string[]
): Tool {
  return {
    slug: `convert-${fromExt}-to-${toExt}`,
    kind: "convert",
    category: "image",
    inputExt: fromExt === "jpg" ? ["jpg", "jpeg"] : [fromExt],
    targetFormat,
    label: `${fromLabel} to ${toLabel}`,
    title: `Convert ${fromLabel} to ${toLabel} Online — Free & Private | Squished`,
    h1: `Convert ${fromLabel} to ${toLabel} in your browser`,
    description: `Convert ${fromLabel} images to ${toLabel} instantly. Free, no upload — your files never leave your device.`,
    intro: `Drop ${fromLabel} files and download them as ${toLabel}. Everything runs locally with WebAssembly — no servers involved.`,
    faq: [
      PRIVACY_FAQ,
      {
        q: `${fromLabel} vs ${toLabel}?`,
        a:
          toExt === "webp"
            ? `WebP produces 25–35% smaller files than JPEG or PNG at the same quality and is supported in all modern browsers.`
            : toExt === "png"
            ? `PNG is lossless and supports transparency — great for logos, screenshots, and graphics.`
            : `JPEG is the most universally supported format and produces small files for photos.`,
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related,
  };
}

export const TOOLS: Tool[] = [
  // ---- Audio compress ----
  audioCompress("mp3", "MP3", "mp3", ["compress-wav", "compress-m4a", "convert-mp3-to-m4a", "convert-wav-to-mp3"]),
  audioCompress("wav", "WAV", "wav", ["compress-mp3", "convert-wav-to-mp3", "convert-wav-to-m4a"]),
  audioCompress("m4a", "M4A", "m4a", ["compress-mp3", "convert-m4a-to-mp3", "convert-mp3-to-m4a"]),
  audioCompress("ogg", "OGG", "ogg", ["compress-mp3", "convert-mp3-to-ogg", "convert-ogg-to-mp3"]),

  // ---- Audio convert ----
  audioConvert("wav", "mp3", "WAV", "MP3", "mp3", ["convert-mp3-to-wav", "compress-mp3", "convert-wav-to-m4a"]),
  audioConvert("mp3", "wav", "MP3", "WAV", "wav", ["convert-wav-to-mp3", "compress-wav", "convert-mp3-to-m4a"]),
  audioConvert("m4a", "mp3", "M4A", "MP3", "mp3", ["convert-mp3-to-m4a", "compress-mp3", "convert-m4a-to-wav"]),
  audioConvert("mp3", "m4a", "MP3", "M4A", "m4a", ["convert-m4a-to-mp3", "compress-m4a", "convert-mp3-to-wav"]),
  audioConvert("wav", "m4a", "WAV", "M4A", "m4a", ["convert-m4a-to-wav", "convert-wav-to-mp3", "compress-m4a"]),
  audioConvert("m4a", "wav", "M4A", "WAV", "wav", ["convert-wav-to-m4a", "convert-m4a-to-mp3", "compress-wav"]),
  audioConvert("ogg", "mp3", "OGG", "MP3", "mp3", ["convert-mp3-to-ogg", "compress-ogg", "compress-mp3"]),
  audioConvert("mp3", "ogg", "MP3", "OGG", "ogg", ["convert-ogg-to-mp3", "compress-mp3", "compress-ogg"]),

  // ---- Video compress ----
  videoCompress("mp4", "MP4", "mp4", ["compress-webm", "convert-mp4-to-webm", "convert-webm-to-mp4"]),
  videoCompress("webm", "WebM", "webm", ["compress-mp4", "convert-webm-to-mp4", "convert-mp4-to-webm"]),

  // ---- Video convert ----
  videoConvert("mp4", "webm", "MP4", "WebM", "webm", ["convert-webm-to-mp4", "compress-mp4", "compress-webm"]),
  videoConvert("webm", "mp4", "WebM", "MP4", "mp4", ["convert-mp4-to-webm", "compress-mp4", "compress-webm"]),

  // ---- Image compress ----
  imageCompress("jpg", "JPG", "jpeg", ["compress-png", "compress-webp", "convert-png-to-jpg", "convert-jpg-to-webp"]),
  imageCompress("png", "PNG", "png", ["compress-jpg", "compress-webp", "convert-png-to-webp", "convert-png-to-jpg"]),
  imageCompress("webp", "WebP", "webp", ["compress-jpg", "compress-png", "convert-webp-to-jpg", "convert-jpg-to-webp"]),

  // ---- Image convert ----
  imageConvert("png", "jpg", "PNG", "JPG", "jpeg", ["convert-jpg-to-png", "convert-png-to-webp", "compress-png"]),
  imageConvert("jpg", "png", "JPG", "PNG", "png", ["convert-png-to-jpg", "convert-jpg-to-webp", "compress-jpg"]),
  imageConvert("png", "webp", "PNG", "WebP", "webp", ["convert-webp-to-png", "convert-png-to-jpg", "compress-png"]),
  imageConvert("webp", "png", "WebP", "PNG", "png", ["convert-png-to-webp", "convert-webp-to-jpg", "compress-webp"]),
  imageConvert("jpg", "webp", "JPG", "WebP", "webp", ["convert-webp-to-jpg", "convert-jpg-to-png", "compress-jpg"]),
  imageConvert("webp", "jpg", "WebP", "JPG", "jpeg", ["convert-jpg-to-webp", "convert-webp-to-png", "compress-webp"]),
];

export const TOOLS_BY_SLUG: Record<string, Tool> = Object.fromEntries(
  TOOLS.map((t) => [t.slug, t])
);

export function getTool(slug: string): Tool | undefined {
  return TOOLS_BY_SLUG[slug];
}

export function acceptString(tool: Tool): string {
  return accept(tool.inputExt);
}

export const POPULAR_SLUGS = [
  "compress-mp3",
  "compress-mp4",
  "compress-jpg",
  "compress-png",
  "convert-png-to-jpg",
  "convert-jpg-to-webp",
  "convert-mp4-to-webm",
  "convert-wav-to-mp3",
  "convert-mp3-to-m4a",
  "compress-webp",
  "convert-png-to-webp",
  "compress-wav",
];
