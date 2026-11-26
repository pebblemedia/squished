// Port of fit() from the web app's src/lib/processors/image-worker.ts.
import { encode, resize, type Format } from "./codecs.js";

export async function pixelsAt(src: ImageData, scale: number): Promise<ImageData> {
  if (scale >= 1) return src;
  const width = Math.max(1, Math.floor(src.width * scale));
  const height = Math.max(1, Math.floor(src.height * scale));
  return resize(src, width, height);
}

/** Highest quality that fits; shrinks dimensions only when the lowest quality still doesn't. */
export async function fit(
  src: ImageData,
  target: Format,
  maxQ: number,
  limit: number,
  scale: number,
): Promise<{ buffer: ArrayBuffer; scale: number; quality: number; width: number; height: number }> {
  const MIN_Q = 0.1;
  for (let round = 0; round < 6; round++) {
    const data = await pixelsAt(src, scale);
    const done = (buffer: ArrayBuffer, quality: number) =>
      ({ buffer, scale, quality, width: data.width, height: data.height });
    if (target === "png") {
      const buf = await encode(data, "png", 1);
      if (buf.byteLength <= limit) return done(buf, 1);
      scale *= Math.sqrt(limit / buf.byteLength) * 0.95;
      continue;
    }
    const top = await encode(data, target, maxQ);
    if (top.byteLength <= limit) return done(top, maxQ);
    const floor = await encode(data, target, MIN_Q);
    if (floor.byteLength > limit) {
      scale *= Math.sqrt(limit / floor.byteLength) * 0.95;
      continue;
    }
    // Size grows roughly exponentially with quality, so interpolate in log space:
    // usually lands within a few percent of the limit in 2–3 encodes.
    let best = floor;
    let bestQ = MIN_Q;
    let lo = MIN_Q, loSize = floor.byteLength;
    let hi = maxQ, hiSize = top.byteLength;
    for (let i = 0; i < 4; i++) {
      const t = (Math.log(limit * 0.97) - Math.log(loSize)) / (Math.log(hiSize) - Math.log(loSize));
      const span = hi - lo;
      const q = Math.min(hi - span * 0.1, Math.max(lo + span * 0.1, lo + span * t));
      const buf = await encode(data, target, q);
      if (buf.byteLength <= limit) {
        best = buf; bestQ = q; lo = q; loSize = buf.byteLength;
        if (buf.byteLength >= limit * 0.93) break;
      } else {
        hi = q; hiSize = buf.byteLength;
      }
    }
    return done(best, bestQ);
  }
  throw new Error("Couldn't get this image under the size limit.");
}
