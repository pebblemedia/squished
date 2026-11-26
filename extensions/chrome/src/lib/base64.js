const STEP = 0x8000;

export function bytesToBase64(bytes) {
  if (typeof bytes.toBase64 === "function") return bytes.toBase64();
  let binary = "";
  for (let i = 0; i < bytes.length; i += STEP) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + STEP));
  }
  return btoa(binary);
}

export function base64ToBytes(b64) {
  if (typeof Uint8Array.fromBase64 === "function") return Uint8Array.fromBase64(b64);
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}
