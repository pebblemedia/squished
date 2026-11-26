import { existsSync, readFileSync } from "node:fs";

const KNOWN_PERMISSIONS = new Set([
  "activeTab", "alarms", "contextMenus", "downloads", "notifications", "scripting", "storage",
  "tabs", "unlimitedStorage", "offscreen", "sidePanel", "clipboardWrite",
]);
const RUN_AT = new Set(["document_start", "document_end", "document_idle"]);
const MATCH = /^(\*|https?|wss?|ftp|urn):\/\/(\*|\*\.[^/*:]+|[^/*:]+)(:(\*|\d+))?\/.*$/;

export const isMatchPattern = (p) => p === "<all_urls>" || /^file:\/\/\/.*$/.test(p) || MATCH.test(p);

function pngSize(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) return null;
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

export function validateManifest(m, { distUrl }) {
  const errors = [];
  const err = (msg) => errors.push(msg);
  const file = (path) => new URL(path, distUrl);
  const mustExist = (path, where) => existsSync(file(path)) || err(`${where}: missing file ${path}`);

  if (m.manifest_version !== 3) err("manifest_version must be 3");
  if (!m.name || m.name.length > 75) err("name required, max 75 chars");
  if (m.description && m.description.length > 132) err("description max 132 chars");
  if (!/^\d+(\.\d+){0,3}$/.test(m.version || "") || m.version.split(".").some((n) => Number(n) > 65535)) err("bad version");
  for (const key of ["browser_action", "page_action"]) if (key in m) err(`${key} is MV2-only`);

  const bg = m.background || {};
  if (typeof bg.service_worker !== "string") err("background.service_worker required");
  else mustExist(bg.service_worker, "background");
  if ("scripts" in bg || "persistent" in bg || "page" in bg) err("MV2 background keys present");
  if (bg.type !== undefined && bg.type !== "module") err("background.type must be 'module' if set");

  for (const p of m.permissions || []) {
    if (!KNOWN_PERMISSIONS.has(p)) err(`unknown or host permission in permissions: ${p}`);
  }
  for (const key of ["host_permissions", "optional_host_permissions"]) {
    for (const p of m[key] || []) if (!isMatchPattern(p)) err(`${key}: invalid match pattern ${p}`);
  }
  if ((m.host_permissions || []).includes("<all_urls>")) err("broad host permission requested up front");

  for (const [i, cs] of (m.content_scripts || []).entries()) {
    if (!cs.matches?.length) err(`content_scripts[${i}].matches required`);
    for (const p of cs.matches || []) if (!isMatchPattern(p)) err(`content_scripts[${i}]: bad match ${p}`);
    if (!cs.js?.length && !cs.css?.length) err(`content_scripts[${i}] needs js or css`);
    for (const js of cs.js || []) mustExist(js, `content_scripts[${i}]`);
    if (cs.run_at && !RUN_AT.has(cs.run_at)) err(`content_scripts[${i}].run_at invalid`);
  }

  const iconSets = [["icons", m.icons], ["action.default_icon", m.action?.default_icon]];
  for (const [where, set] of iconSets) {
    for (const [size, path] of Object.entries(set || {})) {
      if (!existsSync(file(path))) {
        err(`${where}: missing ${path}`);
        continue;
      }
      const dims = pngSize(readFileSync(file(path)));
      if (!dims || dims[0] !== Number(size) || dims[1] !== Number(size)) err(`${where}: ${path} is not a ${size}x${size} PNG`);
    }
  }
  if (!m.icons?.["128"]) err("icons.128 required for the Web Store");

  for (const js of [bg.service_worker, ...(m.content_scripts || []).flatMap((c) => c.js || [])]) {
    if (!js || !existsSync(file(js))) continue;
    const src = readFileSync(file(js), "utf8");
    if (/\beval\(|new Function\(/.test(src)) err(`${js}: eval/new Function not allowed`);
    if (/import\s*\(\s*["']https?:/.test(src) || /importScripts\(/.test(src)) err(`${js}: remote code`);
  }
  return errors;
}
