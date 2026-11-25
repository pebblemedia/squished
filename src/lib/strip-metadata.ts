// Lossless metadata removal: drops EXIF/XMP/IPTC/comments (GPS, camera serials,
// timestamps) by rewriting container bytes. Pixels are never re-encoded.
// Keeps colour profiles and JPEG orientation so photos still look right.

const ascii = (b: Uint8Array, at: number, len: number) =>
  String.fromCharCode(...b.subarray(at, at + len));

/** Reads the EXIF Orientation (1–8) from a JPEG APP1 payload, or 1. */
function readOrientation(seg: Uint8Array): number {
  // seg starts at "Exif\0\0"
  if (ascii(seg, 0, 4) !== "Exif") return 1;
  const t = 6;
  const le = seg[t] === 0x49;
  const dv = new DataView(seg.buffer, seg.byteOffset, seg.byteLength);
  const u16 = (o: number) => dv.getUint16(t + o, le);
  const u32 = (o: number) => dv.getUint32(t + o, le);
  try {
    const ifd = u32(4);
    const count = u16(ifd);
    for (let i = 0; i < count; i++) {
      const e = ifd + 2 + i * 12;
      if (u16(e) === 0x0112) {
        const v = u16(e + 8);
        return v >= 1 && v <= 8 ? v : 1;
      }
    }
  } catch {
    /* malformed EXIF */
  }
  return 1;
}

/** Minimal APP1 segment carrying only the Orientation tag. */
function orientationApp1(o: number): Uint8Array {
  return new Uint8Array([
    0xff, 0xe1, 0x00, 0x22, // APP1, length 34
    0x45, 0x78, 0x69, 0x66, 0x00, 0x00, // "Exif\0\0"
    0x4d, 0x4d, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x08, // big-endian TIFF, IFD0 at 8
    0x00, 0x01, // 1 entry
    0x01, 0x12, 0x00, 0x03, 0x00, 0x00, 0x00, 0x01, 0x00, o, 0x00, 0x00, // Orientation SHORT
    0x00, 0x00, 0x00, 0x00, // no next IFD
  ]);
}

function stripJpeg(b: Uint8Array): Uint8Array<ArrayBuffer> {
  const keep: Uint8Array[] = [b.subarray(0, 2)];
  let orientation = 1;
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) throw new Error("Corrupt JPEG");
    const m = b[i + 1];
    if (m === 0xff) { i++; continue; }
    if (m === 0xda) { keep.push(b.subarray(i)); break; }
    if ((m >= 0xd0 && m <= 0xd7) || m === 0x01) { keep.push(b.subarray(i, i + 2)); i += 2; continue; }
    const len = (b[i + 2] << 8) | b[i + 3];
    const seg = b.subarray(i, i + 2 + len);
    const payload = seg.subarray(4);
    if (m === 0xe1) {
      if (ascii(payload, 0, 4) === "Exif") {
        const o = readOrientation(payload);
        if (o !== 1) orientation = o;
      }
    } else if (m === 0xe2) {
      if (ascii(payload, 0, 11) === "ICC_PROFILE") keep.push(seg);
    } else if (m === 0xe0 || m === 0xee || m < 0xe0 || (m > 0xef && m !== 0xfe)) {
      keep.push(seg); // JFIF, Adobe colour transform, and all image-data segments
    }
    i += 2 + len;
  }
  if (orientation !== 1) keep.splice(1, 0, orientationApp1(orientation));
  return concat(keep);
}

const PNG_DROP = new Set(["tEXt", "zTXt", "iTXt", "eXIf", "tIME"]);

function stripPng(b: Uint8Array): Uint8Array<ArrayBuffer> {
  const keep: Uint8Array[] = [b.subarray(0, 8)];
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let i = 8;
  while (i + 12 <= b.length) {
    const len = dv.getUint32(i);
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + len;
    if (!PNG_DROP.has(type)) keep.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }
  return concat(keep);
}

function stripWebp(b: Uint8Array): Uint8Array<ArrayBuffer> {
  const keep: Uint8Array[] = [new Uint8Array(12)];
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const size = dv.getUint32(i + 4, true);
    const end = Math.min(b.length, i + 8 + size + (size & 1));
    if (type === "VP8X") {
      const chunk = b.slice(i, end);
      chunk[8] &= ~(0x08 | 0x04); // clear EXIF + XMP flags
      keep.push(chunk);
    } else if (type !== "EXIF" && type !== "XMP ") {
      keep.push(b.subarray(i, end));
    }
    i = end;
  }
  const out = concat(keep);
  out.set(b.subarray(0, 12));
  new DataView(out.buffer).setUint32(4, out.length - 8, true);
  return out;
}

function concat(parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** Returns a metadata-free copy, or null if the format can't be cleaned losslessly. */
export async function stripMetadata(blob: Blob): Promise<Blob | null> {
  const b = new Uint8Array(await blob.arrayBuffer());
  if (b[0] === 0xff && b[1] === 0xd8) return new Blob([stripJpeg(b)], { type: "image/jpeg" });
  if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG") return new Blob([stripPng(b)], { type: "image/png" });
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return new Blob([stripWebp(b)], { type: "image/webp" });
  return null;
}
