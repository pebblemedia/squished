const EXT = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/avif": "avif" };

/** "IMG 2041 Front Door (1)" -> "img-2041-front-door-1". Keeps non-Latin letters. */
export function slugify(base) {
  return (
    base
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "") || "image"
  );
}

/** Name for the compressed file: new extension when the format changed, optional slug. */
export function outputName(name, type, seo) {
  const dot = name.lastIndexOf(".");
  const base = dot > 0 ? name.slice(0, dot) : name;
  const oldExt = dot > 0 ? name.slice(dot + 1) : "";
  const sameFormat = EXT[type] === "jpg" ? /^jpe?g$/i.test(oldExt) : oldExt.toLowerCase() === EXT[type];
  const ext = sameFormat ? oldExt : EXT[type];
  return seo ? `${slugify(base)}.${ext.toLowerCase()}` : `${base}.${ext}`;
}
