export const PROD_ORIGIN = "https://squished.app";
export const DEV_ORIGIN = "http://localhost:8080";

export function buildManifest({ version, dev = false }) {
  const squishedMatches = [`${PROD_ORIGIN}/*`, ...(dev ? [`${DEV_ORIGIN}/*`] : [])];
  const icons = { 16: "icons/icon-16.png", 32: "icons/icon-32.png", 48: "icons/icon-48.png", 128: "icons/icon-128.png" };
  return {
    manifest_version: 3,
    name: dev ? "Squished (dev)" : "Squished",
    version,
    description: "Right-click any image to squish it or make it fit, privately in your browser.",
    minimum_chrome_version: "116",
    icons,
    action: { default_title: "Open Squished", default_icon: icons },
    background: { service_worker: "service-worker.js", type: "module" },
    permissions: ["contextMenus", "notifications", "scripting"],
    host_permissions: squishedMatches,
    optional_host_permissions: ["<all_urls>"],
    content_scripts: [
      {
        matches: squishedMatches,
        js: ["content-script.js"],
        run_at: "document_start",
      },
    ],
  };
}
