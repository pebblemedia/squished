/* global __SQUISHED_ORIGINS__ */
export const SQUISHED_ORIGINS = __SQUISHED_ORIGINS__;
export const HOME_URL = `${SQUISHED_ORIGINS[0]}/`;

const NON_QUEUE_PATHS = new Set(["tools", "limits", "login", "auth", ".lovable"]);
const PING_INTERVAL_MS = 300;
const READY_TIMEOUT_MS = 20000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function acceptsFiles(tabUrl, { homeOnly }) {
  try {
    const { pathname } = new URL(tabUrl);
    const segments = pathname.split("/").filter(Boolean);
    if (segments.length === 0) return true;
    return !homeOnly && segments.length === 1 && !NON_QUEUE_PATHS.has(segments[0]);
  } catch {
    return false;
  }
}

async function squishedTabs() {
  return chrome.tabs.query({ url: SQUISHED_ORIGINS.map((o) => `${o}/*`) });
}

function pick(tabs) {
  return tabs.find((t) => t.active && t.highlighted) || tabs.find((t) => t.active) || tabs[0];
}

async function focus(tab) {
  await chrome.tabs.update(tab.id, { active: true });
  await chrome.windows.update(tab.windowId, { focused: true });
  return tab;
}

export async function openAnySquishedTab() {
  const tab = pick(await squishedTabs());
  return tab ? focus(tab) : chrome.tabs.create({ url: HOME_URL });
}

export async function openFileQueueTab({ homeOnly }) {
  const tabs = (await squishedTabs()).filter((t) => acceptsFiles(t.url, { homeOnly }));
  const tab = pick(tabs);
  return tab ? focus(tab) : chrome.tabs.create({ url: HOME_URL });
}

async function ping(tabId) {
  try {
    const reply = await chrome.tabs.sendMessage(tabId, { type: "squished:ping" });
    return reply?.ready ? "ready" : "waiting";
  } catch {
    return "absent";
  }
}

export async function waitForReady(tabId, timeoutMs = READY_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  let injected = false;
  while (Date.now() < deadline) {
    const state = await ping(tabId);
    if (state === "ready") return;
    if (state === "absent" && !injected) {
      const tab = await chrome.tabs.get(tabId);
      if (tab.status === "complete") {
        injected = true;
        await chrome.scripting.executeScript({ target: { tabId }, files: ["content-script.js"] }).catch(() => {});
      }
    }
    await sleep(PING_INTERVAL_MS);
  }
  throw new Error("Squished tab did not get ready in time");
}
