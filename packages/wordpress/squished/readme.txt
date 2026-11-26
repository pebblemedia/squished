=== Squished ===
Contributors: squished
Tags: image compression, optimize images, webp, avif, resize
Requires at least: 6.3
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 0.1.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Compresses images in your browser before they upload. No third-party server, no API key, no quota, no server CPU.

== Description ==

Most image optimizers upload your photos to someone else's server, meter you with a monthly quota, or hammer your own server after the upload. Squished does the work in the editor's browser, before the file leaves the computer.

* **Private.** Images never go to a third party. The plugin makes no external requests and has no tracking.
* **Free.** No account, no API key, no quota, no upsells.
* **Light on your server.** Compression runs in the browser, so your host does no extra work.
* **Smaller uploads.** JPEG, PNG and WebP images are resized and re-encoded with MozJPEG, libwebp, libavif and OxiPNG (compiled to WebAssembly and shipped with the plugin).

Works with the Media Library grid, the media modal, Media → Add New, and the block editor's upload buttons and drag-and-drop.

= Settings (Settings → Squished) =

* Turn compression on or off.
* Max longest side (default 2560 pixels, matching WordPress's big-image threshold).
* Keep the original format, or convert to WebP or AVIF. AVIF is used only if the browser can encode it; otherwise the image keeps its format. WebP and AVIF are offered only when your server can make thumbnails of them.
* Quality (default 80).
* Keep GPS location (on by default, helpful for local SEO) or strip all metadata. Camera details, serial numbers and timestamps are always removed. GPS is kept only in JPEG output; WebP and AVIF output carry no location.
* SEO file names: "IMG 2041 Front Door.JPG" uploads as "img-2041-front-door.jpg".

= What it skips =

GIF, SVG, animated PNG/WebP and non-image files upload as they are. If compression fails, or the result isn't smaller, the original uploads untouched.

== Installation ==

1. Upload the `squished` folder to `/wp-content/plugins/`, or install the zip from Plugins → Add New → Upload Plugin.
2. Activate Squished.
3. Optionally adjust Settings → Squished.

== Frequently Asked Questions ==

= Does it compress images already in my Media Library? =

No. Squished works on new uploads only, in the browser of whoever is uploading.

= Which browsers are supported? =

Current Chrome, Edge, Firefox and Safari. Older browsers without Web Workers or OffscreenCanvas upload the original file.

= Does any data leave my site? =

No. The compressor and its WebAssembly files load from your own site. Nothing is sent anywhere except the normal upload to your WordPress.

= Where is the source code? =

The unminified JavaScript is in the plugin's `src/` folder. `assets/` is built from it with esbuild. Third-party licenses are in `assets/licenses/`.

== Changelog ==

= 0.1.0 =
* First release.
