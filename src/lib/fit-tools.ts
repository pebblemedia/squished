// Landing pages for "make it fit": one per size target and one per destination.
// Generated from DESTINATIONS so the limits, sources and copy stay in one place.
import type { FaqEntry, Tool } from "./tools";
import { DESTINATIONS, LIMITS_CHECKED, type Destination, type DestinationRule } from "./destinations";
import { sizeLabel } from "./fit";

const KB = 1024;
const MB = 1024 * KB;

const IMAGE_EXT = ["jpg", "jpeg", "png", "webp", "heic", "heif"];
const VIDEO_EXT = ["mp4", "mov", "webm", "mkv", "m4v"];
const AUDIO_EXT = ["mp3", "wav", "m4a", "ogg", "aac", "flac"];
const ALL_EXT = [...IMAGE_EXT, ...VIDEO_EXT, ...AUDIO_EXT, "pdf"];

const PRIVACY: FaqEntry = {
  q: "Are my files uploaded anywhere?",
  a: "No. Squished shrinks files on your own device with WebAssembly. Nothing is sent to a server.",
};

const HOW_FIT: FaqEntry = {
  q: "How does Squished hit the size?",
  a: "It tries the highest quality first and steps down only as far as needed. If the lowest quality still doesn't fit, it reduces the dimensions (images) or resolution (video) until it does.",
};

const TOO_BIG: FaqEntry = {
  q: "What if it still doesn't fit?",
  a: "Squished tells you. Try WebP or AVIF for images, trim long videos, or split a big PDF. The original file is never changed.",
};

const MAX_USEFUL = 600 * MB;

function extFor(rule: DestinationRule): string[] {
  switch (rule.kind) {
    case "image": return IMAGE_EXT;
    case "video": return VIDEO_EXT;
    case "audio": return AUDIO_EXT;
    case "pdf": return ["pdf"];
    default: return ALL_EXT;
  }
}

const noun = (rule: DestinationRule) =>
  rule.kind === "image" ? "photos" : rule.kind === "video" ? "videos" : rule.kind === "audio" ? "audio" : rule.kind === "pdf" ? "PDFs" : "files";

function destinationTool(d: Destination): Tool | undefined {
  const rule = d.rules.find((r) => r.maxBytes && r.maxBytes <= MAX_USEFUL);
  if (!rule?.maxBytes) return undefined;
  const limit = sizeLabel(rule.maxBytes);
  const what = noun(rule);
  const others = d.rules
    .filter((r) => r !== rule && r.maxBytes)
    .map((r) => `${r.label ?? r.kind}: ${sizeLabel(r.maxBytes!)}`)
    .join("; ");
  return {
    slug: `compress-for-${d.slug}`,
    kind: "fit",
    category: "fit",
    inputExt: extFor(rule),
    targetFormat: "original",
    fit: { type: "dest", slug: d.slug },
    label: `Fit ${d.name} (${limit})`,
    title: `Compress ${what === "files" ? "Files" : what[0].toUpperCase() + what.slice(1)} for ${d.name} (${limit} Limit) — Free | Squished`,
    h1: `Make ${what} fit the ${limit} ${d.name} limit`,
    dropTitle: `Drop your ${what}`,
    description: `Shrink ${what} under the ${limit} ${d.name} upload limit in one step. Free, private, no upload — runs on your device.`,
    intro: `${d.name} uploads are capped at ${limit}. Drop your ${what} and Squished finds the best quality that fits — without uploading anything.`,
    faq: [
      {
        q: `What's the file size limit for ${d.name}?`,
        a: `${rule.label ?? "Uploads"}: ${limit}.${others ? ` Also: ${others}.` : ""}${d.note ? ` ${d.note}` : ""} Checked ${LIMITS_CHECKED} against the official help page.`,
      },
      HOW_FIT,
      PRIVACY,
      TOO_BIG,
    ],
    related: [],
  };
}

function sizeTool(slug: string, bytes: number, what: string, ext: string[]): Tool {
  const limit = sizeLabel(bytes);
  return {
    slug,
    kind: "fit",
    category: "fit",
    inputExt: ext,
    targetFormat: "original",
    fit: { type: "size", bytes },
    label: `${what} to ${limit}`,
    title: `Compress ${what} to ${limit} Online — Free & Private | Squished`,
    h1: `Compress ${what} to ${limit}`,
    dropTitle: `Drop your ${what === "JPG" ? "photos" : what === "PDF" ? "PDFs" : "videos"}`,
    description: `Get any ${what} under ${limit} in one step — for forms, email and upload limits. Free, no upload, runs on your device.`,
    intro: `Forms and portals often reject files over ${limit}. Drop your ${what} and Squished finds the best quality that stays under ${limit}.`,
    faq: [HOW_FIT, PRIVACY, TOO_BIG],
    related: [],
  };
}

const sizeTools: Tool[] = [
  ...[20, 50, 100, 200, 500].map((kb) =>
    sizeTool(`compress-jpg-to-${kb}kb`, kb * KB, "JPG", IMAGE_EXT)),
  ...[[100, "100kb"], [200, "200kb"], [500, "500kb"], [1024, "1mb"], [2048, "2mb"]].map(([kb, s]) =>
    sizeTool(`compress-pdf-to-${s}`, (kb as number) * KB, "PDF", ["pdf"])),
  ...[10, 25].map((mb) =>
    sizeTool(`compress-video-to-${mb}mb`, mb * MB, "video", VIDEO_EXT)),
];

const destTools = DESTINATIONS.map(destinationTool).filter((t): t is Tool => !!t);

/** Related links: siblings in the same family. */
function withRelated(list: Tool[]): Tool[] {
  return list.map((t, i) => ({
    ...t,
    related: [...list.slice(i + 1), ...list.slice(0, i)].slice(0, 4).map((x) => x.slug),
  }));
}

export const FIT_TOOLS: Tool[] = [...withRelated(destTools), ...withRelated(sizeTools)];
