// Block editor drag-and-drop and "Upload" buttons post straight to /wp/v2/media
// through wp.apiFetch, not plupload. This middleware swaps the file first.
import { squish, handles } from "./compress.js";
import { track } from "./notice.js";

const MEDIA_ROUTE = /\/wp\/v2\/media(?:[/?]|$)|rest_route=%2Fwp%2Fv2%2Fmedia(?:&|$)|rest_route=\/wp\/v2\/media(?:&|$)/;

function isMediaCreate(options) {
  const target = options.path || options.url || "";
  return (
    (options.method || "GET").toUpperCase() === "POST" &&
    typeof FormData !== "undefined" &&
    options.body instanceof FormData &&
    MEDIA_ROUTE.test(target) &&
    !/\/wp\/v2\/media\/\d+/.test(target)
  );
}

async function swap(options) {
  const file = options.body.get("file");
  if (!(file instanceof File) || !handles(file)) return options;
  const result = await track(squish(file)).catch(() => null);
  if (!result) return options;
  const body = new FormData();
  options.body.forEach((value, key) => {
    if (key === "file") body.append("file", result.file, result.file.name);
    else body.append(key, value);
  });
  return { ...options, body };
}

export function hookApiFetch() {
  const apiFetch = window.wp && window.wp.apiFetch;
  if (!apiFetch || typeof apiFetch.use !== "function") return;
  apiFetch.use((options, next) => {
    if (!isMediaCreate(options)) return next(options);
    return swap(options).then(next, () => next(options));
  });
}
