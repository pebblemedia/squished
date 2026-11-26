import { bytesToBase64 } from "../lib/base64.js";

export const CHUNK_BYTES = 32 * 1024 * 1024;

export function chunkCount(size, chunkBytes = CHUNK_BYTES) {
  return Math.max(1, Math.ceil(size / chunkBytes));
}

export async function sendFile(send, { bytes, name, mime, fit }, chunkBytes = CHUNK_BYTES) {
  const id = crypto.randomUUID();
  const chunks = chunkCount(bytes.byteLength, chunkBytes);
  await send({ type: "squished:file-begin", id, name, mime, size: bytes.byteLength, chunks });
  for (let index = 0; index < chunks; index++) {
    const slice = bytes.subarray(index * chunkBytes, (index + 1) * chunkBytes);
    await send({ type: "squished:file-chunk", id, index, data: bytesToBase64(slice) });
  }
  const reply = await send({ type: "squished:file-end", id, ...(fit ? { fit } : {}) });
  if (!reply?.ok) throw new Error(reply?.error || "Squished tab did not take the file");
}
