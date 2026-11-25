import type { QueueItem } from "./files";

export interface ImageMeta {
  title?: string;
  description?: string;
  keywords?: string;
  author?: string;
  copyright?: string;
  location?: string;
  latitude?: string;
  longitude?: string;
}

export function hasMeta(m?: ImageMeta) {
  return !!m && Object.values(m).some((v) => v && String(v).trim());
}

/** Final download name, applying the user's custom name (keeps the output extension). */
export function finalName(item: QueueItem): string {
  const out = item.outputName ?? item.name;
  const custom = item.customName?.trim();
  if (!custom) return out;
  const dot = out.lastIndexOf(".");
  const ext = dot === -1 ? "" : out.slice(dot);
  const safe = custom.replace(/[\\/:*?"<>|]+/g, "-").replace(/\.[a-z0-9]{2,5}$/i, "");
  return `${safe}${ext}`;
}

// Windows XP* tags are UCS-2 little-endian byte arrays.
const ucs2 = (s: string) => {
  const out: number[] = [];
  for (const ch of s) {
    const c = ch.charCodeAt(0);
    out.push(c & 0xff, c >> 8);
  }
  out.push(0, 0);
  return out;
};

const toDms = (deg: number): [number, number][] => {
  const a = Math.abs(deg);
  const d = Math.floor(a);
  const mFloat = (a - d) * 60;
  const m = Math.floor(mFloat);
  const s = Math.round((mFloat - m) * 60 * 100);
  return [[d, 1], [m, 1], [s, 100]];
};

const blobToBinary = async (blob: Blob) => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let out = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    out += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return out;
};

/** Embed EXIF metadata into a JPEG blob. Non-JPEG blobs are returned unchanged. */
export async function embedMeta(blob: Blob, meta?: ImageMeta): Promise<Blob> {
  if (!meta || !hasMeta(meta) || blob.type !== "image/jpeg") return blob;
  const piexif = (await import("piexifjs")).default;
  const m = meta;
  const zeroth: Record<number, unknown> = {};
  const gps: Record<number, unknown> = {};
  const desc = [m.description, m.location].filter(Boolean).join(" — ");
  if (m.title) zeroth[piexif.ImageIFD.XPTitle] = ucs2(m.title);
  if (desc) {
    zeroth[piexif.ImageIFD.ImageDescription] = desc;
    zeroth[piexif.ImageIFD.XPSubject] = ucs2(desc);
  }
  if (m.location) zeroth[piexif.ImageIFD.XPComment] = ucs2(m.location);
  if (m.keywords) zeroth[piexif.ImageIFD.XPKeywords] = ucs2(m.keywords);
  if (m.author) {
    zeroth[piexif.ImageIFD.Artist] = m.author;
    zeroth[piexif.ImageIFD.XPAuthor] = ucs2(m.author);
  }
  if (m.copyright) zeroth[piexif.ImageIFD.Copyright] = m.copyright;
  const lat = parseFloat(m.latitude ?? "");
  const lon = parseFloat(m.longitude ?? "");
  if (!isNaN(lat) && !isNaN(lon)) {
    gps[piexif.GPSIFD.GPSLatitudeRef] = lat >= 0 ? "N" : "S";
    gps[piexif.GPSIFD.GPSLatitude] = toDms(lat);
    gps[piexif.GPSIFD.GPSLongitudeRef] = lon >= 0 ? "E" : "W";
    gps[piexif.GPSIFD.GPSLongitude] = toDms(lon);
  }
  const bin = await blobToBinary(blob);
  const exif = piexif.dump({ "0th": zeroth, GPS: gps });
  const out = piexif.insert(exif, bin);
  const bytes = new Uint8Array(out.length);
  for (let i = 0; i < out.length; i++) bytes[i] = out.charCodeAt(i) & 0xff;
  return new Blob([bytes], { type: "image/jpeg" });
}

/** Output blob + name ready for download (custom name + embedded metadata). */
export async function finalizeOutput(item: QueueItem): Promise<{ blob: Blob; name: string } | null> {
  if (!item.output) return null;
  const blob = item.kind === "image" ? await embedMeta(item.output, item.meta) : item.output;
  return { blob, name: finalName(item) };
}
