// Hooks every plupload instance that uploads to WordPress's media endpoint
// (wp.Uploader for the media grid and modal, and the "Add New Media" page).
// BeforeUpload pauses the file, compresses it, swaps the file source, then resumes.
import { squish, handles } from "./compress.js";
import { track } from "./notice.js";

const MEDIA_ENDPOINT = /async-upload\.php/;
const hooked = new WeakSet();

function swapSource(file, out) {
  const ox = window.moxie || window.mOxie;
  const MoxieFile = ox.file ? ox.file.File : ox.File;
  const original = file.getSource();
  const next = new MoxieFile(original && original.ruid, out);
  file.getSource = () => next;
  file.getNative = () => out;
  file.name = out.name;
  file.type = out.type;
  file.size = out.size;
  if (file.attachment) file.attachment.set({ filename: out.name, size: out.size });
}

function resume(up, file) {
  const pl = window.plupload;
  if (!up.getFile(file.id) || file.status !== pl.QUEUED || up.state !== pl.STARTED) return;
  file.status = pl.UPLOADING;
  up.trigger("UploadFile", file);
}

function beforeUpload(up, file) {
  if (file.squished) return true;
  file.squished = true;
  const native = file.getNative && file.getNative();
  if (!native || !handles(native)) return true;

  track(squish(native))
    .then((result) => {
      if (result) swapSource(file, result.file);
    })
    .catch(() => {})
    .then(() => resume(up, file));
  return false; // Hold this file (and the queue) until compression finishes.
}

export function hookUploader(up) {
  if (!up || hooked.has(up) || !MEDIA_ENDPOINT.test((up.settings && up.settings.url) || "")) return;
  hooked.add(up);
  up.bind("BeforeUpload", beforeUpload, null, 1000);
}

/** Wraps plupload.Uploader so instances created later are hooked too. */
export function hookPlupload() {
  const pl = window.plupload;
  if (!pl || !pl.Uploader || pl.Uploader.squished) return;
  const Original = pl.Uploader;
  function Uploader(options) {
    const up = new Original(options);
    hookUploader(up);
    return up;
  }
  Uploader.prototype = Original.prototype;
  Object.assign(Uploader, Original, { squished: true });
  pl.Uploader = Uploader;
  // "Add New Media" creates its uploader before this script runs.
  if (window.uploader instanceof Original) hookUploader(window.uploader);
}
