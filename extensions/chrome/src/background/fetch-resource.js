import { deriveFilename, resolveMime } from "../lib/filename.js";

export const MAX_BYTES = 200 * 1024 * 1024;

export class TooBigError extends Error {
  constructor() {
    super("File is larger than 200 MB");
    this.name = "TooBigError";
  }
}

async function readCapped(response, max) {
  const declared = Number(response.headers.get("content-length"));
  if (declared > max) throw new TooBigError();
  const reader = response.body.getReader();
  const parts = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      reader.cancel();
      throw new TooBigError();
    }
    parts.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    bytes.set(p, offset);
    offset += p.byteLength;
  }
  return bytes;
}

export async function fetchResource(url, { max = MAX_BYTES, fetchImpl = fetch } = {}) {
  const response = await fetchImpl(url, { credentials: "include", cache: "force-cache" });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  const bytes = await readCapped(response, max);
  const mime = resolveMime(response.headers.get("content-type"), url);
  const name = deriveFilename({ url, contentDisposition: response.headers.get("content-disposition"), mime });
  return { bytes, mime, name };
}
