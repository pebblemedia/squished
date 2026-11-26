const KB = 1024;
const MB = 1024 * KB;

export const LINK_EXTS = ["jpg", "jpeg", "png", "webp", "gif", "avif", "pdf", "mp3", "mp4"];

export const MENU_SQUISH_IMAGE = "squish-image";
export const MENU_SQUISH_LINK = "squish-link";
export const MENU_FIT_PARENT = "fit";

export const FIT_CHOICES = [
  { id: "fit-100kb", title: "Under 100 KB", fit: { type: "size", bytes: 100 * KB } },
  { id: "fit-500kb", title: "Under 500 KB", fit: { type: "size", bytes: 500 * KB } },
  { id: "fit-1mb", title: "Under 1 MB", fit: { type: "size", bytes: 1 * MB } },
  { id: "fit-gmail", title: "Gmail (25 MB)", fit: { type: "dest", slug: "gmail" } },
  { id: "fit-discord", title: "Discord (20 MB)", fit: { type: "dest", slug: "discord" } },
  { id: "fit-etsy", title: "Etsy listing photo", fit: { type: "dest", slug: "etsy" } },
];

export function linkUrlPatterns() {
  const patterns = [];
  for (const ext of LINK_EXTS) {
    for (const e of [ext, ext.toUpperCase()]) patterns.push(`*://*/*.${e}`, `*://*/*.${e}?*`);
  }
  return patterns;
}

export function menuItems() {
  return [
    { id: MENU_SQUISH_IMAGE, title: "Squish this image", contexts: ["image"] },
    { id: MENU_FIT_PARENT, title: "Make it fit…", contexts: ["image"] },
    ...FIT_CHOICES.map(({ id, title }) => ({ id, parentId: MENU_FIT_PARENT, title, contexts: ["image"] })),
    { id: MENU_SQUISH_LINK, title: "Squish this file", contexts: ["link"], targetUrlPatterns: linkUrlPatterns() },
  ];
}

export function fitForMenu(menuItemId) {
  return FIT_CHOICES.find((c) => c.id === menuItemId)?.fit;
}

export function createMenus(contextMenus) {
  contextMenus.removeAll(() => {
    for (const item of menuItems()) contextMenus.create(item);
  });
}
