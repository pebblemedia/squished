// Browsers apply EXIF orientation when decoding; jSquash doesn't. Re-encoded
// files carry no EXIF, so we bake the rotation into the pixels instead.

/** EXIF Orientation (1–8) of a JPEG, or 1. */
export function jpegOrientation(b: Uint8Array): number {
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const m = b[i + 1];
    if (m === 0xda || m === 0xd9) break;
    const len = (b[i + 2] << 8) | b[i + 3];
    if (m === 0xe1 && String.fromCharCode(...b.subarray(i + 4, i + 8)) === "Exif") {
      return readTiffOrientation(b.subarray(i + 10, i + 2 + len));
    }
    i += 2 + len;
  }
  return 1;
}

function readTiffOrientation(t: Uint8Array): number {
  try {
    const le = t[0] === 0x49;
    const dv = new DataView(t.buffer, t.byteOffset, t.byteLength);
    const ifd = dv.getUint32(4, le);
    const count = dv.getUint16(ifd, le);
    for (let n = 0; n < count; n++) {
      const e = ifd + 2 + n * 12;
      if (dv.getUint16(e, le) === 0x0112) {
        const v = dv.getUint16(e + 8, le);
        return v >= 1 && v <= 8 ? v : 1;
      }
    }
  } catch {
    /* malformed EXIF */
  }
  return 1;
}

/** Returns pixels as they should be displayed for the given orientation. */
export function applyOrientation(img: ImageData, o: number): ImageData {
  if (o <= 1 || o > 8) return img;
  const { width: w, height: h } = img;
  const swap = o >= 5;
  const W = swap ? h : w;
  const H = swap ? w : h;
  const src = new Uint32Array(img.data.buffer, img.data.byteOffset, w * h);
  const out = new Uint32Array(W * H);
  for (let dy = 0; dy < H; dy++) {
    for (let dx = 0; dx < W; dx++) {
      let sx: number, sy: number;
      switch (o) {
        case 2: sx = w - 1 - dx; sy = dy; break;
        case 3: sx = w - 1 - dx; sy = h - 1 - dy; break;
        case 4: sx = dx; sy = h - 1 - dy; break;
        case 5: sx = dy; sy = dx; break;
        case 6: sx = dy; sy = h - 1 - dx; break;
        case 7: sx = w - 1 - dy; sy = h - 1 - dx; break;
        default: sx = w - 1 - dy; sy = dx; break; // 8
      }
      out[dy * W + dx] = src[sy * w + sx];
    }
  }
  return new ImageData(new Uint8ClampedArray(out.buffer), W, H);
}
