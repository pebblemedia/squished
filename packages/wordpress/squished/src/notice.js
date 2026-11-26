// Small status toast shown over every uploader (media grid, modal, Add New, block editor).
const { __, _n, sprintf } = window.wp.i18n;

const HIDE_AFTER_MS = 10000;
let el = null;
let text = null;
let timer = null;
let busy = 0;
let saved = 0;
let count = 0;

export function formatBytes(n) {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function ensure() {
  if (el) return;
  el = document.createElement("div");
  el.className = "squished-notice";
  el.setAttribute("role", "status");
  el.setAttribute("aria-live", "polite");
  text = document.createElement("span");
  const close = document.createElement("button");
  close.type = "button";
  close.className = "squished-notice__close";
  close.setAttribute("aria-label", __("Dismiss", "squished"));
  close.textContent = "×";
  close.addEventListener("click", hide);
  el.append(text, close);
  document.body.appendChild(el);
}

function hide() {
  if (el) el.hidden = true;
  if (!busy) {
    saved = 0;
    count = 0;
  }
}

function render() {
  ensure();
  clearTimeout(timer);
  el.hidden = false;
  if (busy) {
    text.textContent = __("Squished is compressing images in your browser…", "squished");
    return;
  }
  if (!count) return hide();
  text.textContent = sprintf(
    /* translators: 1: amount saved, e.g. "2.1 MB". 2: number of images. */
    _n(
      "Squished saved %1$s on %2$d image (in your browser)",
      "Squished saved %1$s on %2$d images (in your browser)",
      count,
      "squished"
    ),
    formatBytes(saved),
    count
  );
  timer = setTimeout(hide, HIDE_AFTER_MS);
}

/** Wraps one compression so the toast shows progress and the running total. */
export async function track(promise) {
  busy++;
  render();
  try {
    const result = await promise;
    if (result) {
      saved += result.saved;
      count++;
    }
    return result;
  } finally {
    busy--;
    render();
  }
}
