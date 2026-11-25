import type { TargetFormat } from "./files";

export type ToolCategory = "audio" | "video" | "image" | "pdf";
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

  // ---- Privacy ----
  {
    slug: "remove-exif",
    kind: "compress",
    category: "image",
    inputExt: ["jpg", "jpeg", "png", "webp", "heic", "heif"],
    targetFormat: "strip",
    label: "Remove photo location",
    title: "Remove EXIF & Location From Photos — Free, Private | Squished",
    h1: "Remove location and EXIF data from photos",
    description: "Strip GPS location, camera details and dates from photos before you post. No quality loss, no upload — runs on your device.",
    intro: "Photos can carry the exact spot they were taken. Drop them here and Squished removes that hidden data without re-compressing — your photos never leave your device.",
    faq: [
      PRIVACY_FAQ,
      {
        q: "What gets removed?",
        a: "GPS location, camera make and serial, date taken, editing software, comments, and XMP/IPTC tags. Colour profiles and orientation are kept so the photo looks the same.",
      },
      {
        q: "Will the photo lose quality?",
        a: "No. For JPG, PNG and WebP, Squished removes the metadata without re-encoding the image. iPhone HEIC photos are converted to a high-quality JPG.",
      },
      FREE_FAQ,
    ],
    related: ["compress-jpg", "convert-heic-to-jpg", "compress-png"],
  },

  // ---- HEIC (iPhone photo) convert ----
  {
    slug: "convert-heic-to-jpg",
    kind: "convert",
    category: "image",
    inputExt: ["heic", "heif"],
    targetFormat: "jpeg",
    label: "HEIC to JPG",
    title: "Convert HEIC to JPG Online — Free & Private | Squished",
    h1: "Convert HEIC to JPG in your browser",
    description: "Turn iPhone HEIC photos into JPG instantly. Free, no upload — your photos never leave your device.",
    intro: "Drop HEIC or HEIF photos from your iPhone and Squished decodes them locally to JPG using WebAssembly. Nothing is uploaded.",
    faq: [
      PRIVACY_FAQ,
      {
        q: "Why convert HEIC to JPG?",
        a: "HEIC is Apple's default photo format and isn't supported by many apps, websites, or Windows programs. JPG works everywhere.",
      },
      {
        q: "Will I lose quality?",
        a: "There's a small re-encoding step from HEIC to JPG. Squished uses a high default quality so the result looks visually identical to the original.",
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related: ["convert-heic-to-png", "convert-heic-to-webp", "compress-jpg"],
  },
  {
    slug: "convert-heic-to-png",
    kind: "convert",
    category: "image",
    inputExt: ["heic", "heif"],
    targetFormat: "png",
    label: "HEIC to PNG",
    title: "Convert HEIC to PNG Online — Free & Private | Squished",
    h1: "Convert HEIC to PNG in your browser",
    description: "Turn iPhone HEIC photos into lossless PNG files. Free, no upload — runs entirely on your device.",
    intro: "Drop HEIC or HEIF photos and Squished decodes them locally to PNG. PNG is lossless, ideal when you need maximum quality.",
    faq: [
      PRIVACY_FAQ,
      {
        q: "HEIC to PNG vs JPG?",
        a: "PNG is lossless but much larger. For photos, JPG is usually a better choice. Pick PNG if you need exact pixel fidelity or transparency.",
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related: ["convert-heic-to-jpg", "convert-heic-to-webp", "compress-png"],
  },
  {
    slug: "convert-heic-to-webp",
    kind: "convert",
    category: "image",
    inputExt: ["heic", "heif"],
    targetFormat: "webp",
    label: "HEIC to WebP",
    title: "Convert HEIC to WebP Online — Free & Private | Squished",
    h1: "Convert HEIC to WebP in your browser",
    description: "Turn iPhone HEIC photos into modern WebP files. Free, no upload — runs entirely on your device.",
    intro: "Drop HEIC or HEIF photos and Squished decodes and re-encodes them locally to WebP — smaller than JPG at the same visual quality.",
    faq: [
      PRIVACY_FAQ,
      {
        q: "Why WebP?",
        a: "WebP produces files 25–35% smaller than JPG at the same quality and is supported by every modern browser.",
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related: ["convert-heic-to-jpg", "convert-heic-to-png", "compress-webp"],
  },


  // ---- PDF ----
  {
    slug: "compress-pdf",
    kind: "compress",
    category: "pdf",
    inputExt: ["pdf"],
    targetFormat: "pdf",
    label: "Compress PDF",
    title: "Compress PDF Online — Free, Private, In Your Browser | Squished",
    h1: "Compress PDF files in your browser",
    description: "Shrink PDF files up to 90% without uploading. Free, private, and runs entirely on your device — no signup, no waiting.",
    intro: "Drop a PDF and Squished re-renders each page at a lower DPI and re-encodes images as JPEG locally. Big savings on scanned and image-heavy PDFs — your file never leaves your device.",
    faq: [
      PRIVACY_FAQ,
      {
        q: "How does PDF compression work?",
        a: "Most PDF size comes from embedded images. Squished rasterizes each page to a JPEG at a configurable quality and rebuilds the PDF. This is the same technique used by major online PDF compressors and typically shrinks files 50–90%.",
      },
      {
        q: "Will compression keep my text searchable?",
        a: "No. Because pages are re-rendered to images, vector text becomes part of the image and is no longer selectable or searchable. If you need searchable text, keep a copy of the original or use a lower compression level.",
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related: ["convert-pdf-to-jpg", "convert-pdf-to-png", "convert-jpg-to-pdf", "convert-png-to-pdf"],
  },
  {
    slug: "convert-pdf-to-jpg",
    kind: "convert",
    category: "pdf",
    inputExt: ["pdf"],
    targetFormat: "pdf-to-jpg",
    label: "PDF to JPG",
    title: "Convert PDF to JPG Online — Free & Private | Squished",
    h1: "Convert PDF to JPG in your browser",
    description: "Turn each PDF page into a high-quality JPG image. Free, no upload, no signup — runs entirely on your device.",
    intro: "Drop a PDF and download a ZIP of JPGs — one per page. Everything runs locally with WebAssembly. No accounts, no upload limits.",
    faq: [
      PRIVACY_FAQ,
      {
        q: "How is the PDF rendered?",
        a: "Squished uses pdf.js to render each page to a canvas, then exports a JPEG. The quality slider controls render DPI and JPEG quality.",
      },
      {
        q: "Why is the output a ZIP?",
        a: "PDFs typically have multiple pages, so we bundle the page images into one ZIP for easy download.",
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related: ["convert-pdf-to-png", "compress-pdf", "convert-jpg-to-pdf"],
  },
  {
    slug: "convert-pdf-to-png",
    kind: "convert",
    category: "pdf",
    inputExt: ["pdf"],
    targetFormat: "pdf-to-png",
    label: "PDF to PNG",
    title: "Convert PDF to PNG Online — Free & Private | Squished",
    h1: "Convert PDF to PNG in your browser",
    description: "Turn each PDF page into a lossless PNG. Free, no upload, no signup — runs entirely on your device.",
    intro: "Drop a PDF and download a ZIP of PNGs — one per page. PNG is lossless, ideal when you need crisp text and graphics.",
    faq: [
      PRIVACY_FAQ,
      {
        q: "JPG vs PNG for PDF pages?",
        a: "PNG is lossless and best for documents with text, line art, or transparency. JPG is smaller but introduces compression artifacts on text edges.",
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related: ["convert-pdf-to-jpg", "compress-pdf", "convert-png-to-pdf"],
  },
  {
    slug: "convert-jpg-to-pdf",
    kind: "convert",
    category: "pdf",
    inputExt: ["jpg", "jpeg"],
    targetFormat: "pdf",
    label: "JPG to PDF",
    title: "Convert JPG to PDF Online — Free & Private | Squished",
    h1: "Convert JPG to PDF in your browser",
    description: "Turn JPG images into PDF files instantly. Free, no upload — your photos never leave your device.",
    intro: "Drop a JPG and Squished embeds it into a one-page PDF locally. Drop multiple files to convert each into its own PDF.",
    faq: [
      PRIVACY_FAQ,
      {
        q: "Can I combine multiple JPGs into one PDF?",
        a: "Right now each image becomes its own PDF. Multi-image merge is on the roadmap — let us know if you'd like it!",
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related: ["convert-pdf-to-jpg", "convert-png-to-pdf", "compress-pdf"],
  },
  {
    slug: "convert-png-to-pdf",
    kind: "convert",
    category: "pdf",
    inputExt: ["png"],
    targetFormat: "pdf",
    label: "PNG to PDF",
    title: "Convert PNG to PDF Online — Free & Private | Squished",
    h1: "Convert PNG to PDF in your browser",
    description: "Turn PNG images into PDF files instantly. Free, no upload — your files stay on your device.",
    intro: "Drop a PNG and Squished embeds it into a one-page PDF locally. Drop multiple files to get one PDF per image.",
    faq: [
      PRIVACY_FAQ,
      {
        q: "Will transparency be preserved?",
        a: "PDFs render PNG with transparency over a white background by default, so the visual result matches what you'd see in a viewer.",
      },
      FREE_FAQ,
      SIZE_FAQ,
    ],
    related: ["convert-pdf-to-png", "convert-jpg-to-pdf", "compress-pdf"],
  },
  {
    slug: "convert-webp-to-pdf",
    kind: "convert",
    category: "pdf",
    inputExt: ["webp"],
    targetFormat: "pdf",
    label: "WebP to PDF",
    title: "Convert WebP to PDF Online — Free & Private | Squished",
    h1: "Convert WebP to PDF in your browser",
    description: "Turn WebP images into PDF files instantly. Free, no upload — your files stay on your device.",
    intro: "Drop a WebP image and Squished re-encodes it locally and embeds it into a PDF — no servers involved.",
    faq: [PRIVACY_FAQ, FREE_FAQ, SIZE_FAQ],
    related: ["convert-jpg-to-pdf", "convert-png-to-pdf", "compress-pdf"],
  },
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
  "compress-pdf",
  "compress-mp3",
  "compress-mp4",
  "compress-jpg",
  "compress-png",
  "convert-pdf-to-jpg",
  "convert-png-to-jpg",
  "convert-jpg-to-pdf",
  "convert-jpg-to-webp",
  "convert-mp4-to-webm",
  "convert-wav-to-mp3",
  "convert-mp3-to-m4a",
];
