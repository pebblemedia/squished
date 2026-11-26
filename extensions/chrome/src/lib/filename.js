const MIME_TO_EXT = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
  "image/svg+xml": "svg",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/heic": "heic",
  "image/heif": "heif",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
  "application/pdf": "pdf",
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "video/mp4": "mp4",
};

const EXT_TO_MIME = {
  jpg: "image/jpeg", jpeg: "image/jpeg", jfif: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", avif: "image/avif", svg: "image/svg+xml", bmp: "image/bmp", tif: "image/tiff",
  tiff: "image/tiff", heic: "image/heic", heif: "image/heif", ico: "image/x-icon",
  pdf: "application/pdf", mp3: "audio/mpeg", mp4: "video/mp4",
};

const SERVER_EXTS = new Set(["php", "asp", "aspx", "jsp", "cgi", "html", "htm", "ashx", "axd"]);
const GENERIC_MIMES = new Set(["", "application/octet-stream", "binary/octet-stream", "application/x-download"]);

export function extFromMime(mime) {
  return MIME_TO_EXT[mime] || "";
}

function splitExt(name) {
  const dot = name.lastIndexOf(".");
  if (dot <= 0 || dot === name.length - 1) return [name, ""];
  return [name.slice(0, dot), name.slice(dot + 1).toLowerCase()];
}

function sanitize(name) {
  const clean = name.replace(/[\u0000-\u001f\u007f/\\:*?"<>|]+/g, "_").replace(/^[\s.]+|[\s.]+$/g, "");
  return clean.slice(0, 200);
}

function safeDecode(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function nameFromContentDisposition(header) {
  if (!header) return "";
  const star = /filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i.exec(header);
  if (star) return safeDecode(star[2].trim().replace(/^"|"$/g, ""));
  const quoted = /filename\s*=\s*"((?:\\.|[^"\\])*)"/i.exec(header);
  if (quoted) return quoted[1].replace(/\\(.)/g, "$1");
  const bare = /filename\s*=\s*([^;]+)/i.exec(header);
  return bare ? bare[1].trim() : "";
}

export function nameFromUrl(url) {
  try {
    const u = new URL(url);
    if (u.protocol !== "http:" && u.protocol !== "https:") return "";
    const segments = u.pathname.split("/").filter(Boolean);
    return segments.length ? safeDecode(segments[segments.length - 1]) : "";
  } catch {
    return "";
  }
}

export function resolveMime(headerType, url) {
  const mime = (headerType || "").split(";")[0].trim().toLowerCase();
  if (!GENERIC_MIMES.has(mime)) return mime;
  const [, ext] = splitExt(nameFromUrl(url));
  return EXT_TO_MIME[ext] || mime || "application/octet-stream";
}

export function deriveFilename({ url, contentDisposition, mime }) {
  const mimeExt = extFromMime(mime);
  const raw = sanitize(nameFromContentDisposition(contentDisposition)) || sanitize(nameFromUrl(url));
  if (!raw) {
    const base = !mime || mime.startsWith("image/") ? "image" : "file";
    return mimeExt ? `${base}.${mimeExt}` : base;
  }
  if (!mimeExt) return raw;
  const [base, ext] = splitExt(raw);
  if (!ext) return `${raw}.${mimeExt}`;
  if (ext === mimeExt || EXT_TO_MIME[ext] === mime) return raw;
  if (SERVER_EXTS.has(ext)) return `${base}.${mimeExt}`;
  const extMime = EXT_TO_MIME[ext];
  if (extMime && extMime.startsWith("image/") && mime.startsWith("image/")) return `${base}.${mimeExt}`;
  if (extMime) return raw;
  return `${raw}.${mimeExt}`;
}
