// Entry point for assets/uploader.js. No network requests besides the plugin's own
// worker and WASM files; no tracking.
import { hookPlupload } from "./plupload-hook.js";
import { hookApiFetch } from "./api-fetch-hook.js";
import { squish } from "./compress.js";

if (window.squishedConfig) {
  hookPlupload();
  hookApiFetch();
  // Exposed for debugging and tests: squished.squish(file) -> { file, saved } | null.
  window.squished = { squish };
}
