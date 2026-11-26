/* global __SQUISHED_TEST__ */
import { createMenus, fitForMenu, MENU_SQUISH_LINK } from "./menus.js";
import { fetchResource, TooBigError } from "./fetch-resource.js";
import { openAnySquishedTab, openFileQueueTab, waitForReady } from "./squished-tab.js";
import { sendFile } from "./transfer.js";

let queue = Promise.resolve();
let pending = 0;

function notify(message) {
  chrome.notifications.create({
    type: "basic",
    iconUrl: "icons/icon-128.png",
    title: "Squished",
    message,
  });
}

function setBusy(delta) {
  pending = Math.max(0, pending + delta);
  chrome.action.setBadgeBackgroundColor({ color: "#1f1f1f" });
  chrome.action.setBadgeText({ text: pending ? String(pending) : "" });
}

async function deliver(url, fit) {
  setBusy(1);
  let handedOff = false;
  try {
    const tabPromise = openFileQueueTab({ homeOnly: Boolean(fit) });
    tabPromise.catch(() => {});
    const file = await fetchResource(url);
    const tab = await tabPromise;
    await waitForReady(tab.id);
    await sendFile((msg) => chrome.tabs.sendMessage(tab.id, msg), { ...file, fit });
    handedOff = true;
  } catch (err) {
    if (err instanceof TooBigError) notify("That file is over 200 MB, too big to send to Squished.");
    else notify(`Couldn't send that file to Squished. ${err.message || ""}`.trim());
  } finally {
    if (!handedOff) setBusy(-1);
  }
}

function enqueue(url, fit) {
  queue = queue.then(() => deliver(url, fit));
  return queue;
}

function originPattern(url) {
  return `${url.protocol}//${url.hostname}/*`;
}

chrome.runtime.onInstalled.addListener(() => createMenus(chrome.contextMenus));

chrome.action.onClicked.addListener(() => {
  openAnySquishedTab();
});

chrome.contextMenus.onClicked.addListener((info) => {
  const raw = info.menuItemId === MENU_SQUISH_LINK ? info.linkUrl : info.srcUrl;
  const fit = fitForMenu(info.menuItemId);
  let url;
  try {
    url = new URL(raw);
  } catch {
    openAnySquishedTab();
    return;
  }
  if (url.protocol === "data:") {
    enqueue(url.href, fit);
    return;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    openFileQueueTab({ homeOnly: Boolean(fit) });
    notify("Squished can't read this image directly. Save it, then drop it into Squished.");
    return;
  }
  // Must run synchronously inside the click handler to keep the user gesture.
  chrome.permissions.request({ origins: [originPattern(url)] }).then(
    (granted) => (granted ? enqueue(url.href, fit) : openAnySquishedTab()),
    () => openAnySquishedTab(),
  );
});

chrome.runtime.onMessage.addListener((msg, sender) => {
  if (msg?.type === "squished:files-added" && sender.id === chrome.runtime.id) setBusy(-1);
});

if (__SQUISHED_TEST__) {
  globalThis.__squishedTest = { deliver: enqueue };
}
