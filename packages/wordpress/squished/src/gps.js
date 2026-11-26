// Copies only the GPS IFD from the original JPEG into the re-encoded JPEG.
// Camera details, serial numbers, timestamps and orientation are not copied
// (pixels are already rotated by createImageBitmap).
import piexif from "piexifjs";

const toBinary = (bytes) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  }
  return s;
};

const fromBinary = (s) => {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
};

/** Returns the original JPEG's APP1 Exif segment as a binary string, or null. */
function exifSegment(bytes) {
  let i = 2;
  while (i + 4 <= bytes.length && bytes[i] === 0xff) {
    const marker = bytes[i + 1];
    if (marker === 0xda || marker === 0xd9) break;
    const len = (bytes[i + 2] << 8) | bytes[i + 3];
    if (marker === 0xe1 && toBinary(bytes.subarray(i + 4, i + 10)) === "Exif\0\0") {
      return toBinary(bytes.subarray(i + 4, i + 2 + len));
    }
    i += 2 + len;
  }
  return null;
}

/** GPS tags of a JPEG, or null when it has none. */
export function readGps(bytes) {
  if (bytes[0] !== 0xff || bytes[1] !== 0xd8) return null;
  const seg = exifSegment(bytes);
  if (!seg) return null;
  try {
    const gps = piexif.load(seg).GPS;
    return gps && Object.keys(gps).length ? gps : null;
  } catch {
    return null;
  }
}

/** Inserts a GPS-only EXIF block into JPEG bytes. */
export function writeGps(jpeg, gps) {
  const exif = piexif.dump({ "0th": {}, Exif: {}, GPS: gps, Interop: {}, "1st": {}, thumbnail: null });
  return fromBinary(piexif.insert(exif, toBinary(jpeg)));
}
