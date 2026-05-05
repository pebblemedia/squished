
# Squish — Browser-based File Compressor & Converter

A clean, utility-first site (TinyPNG-style) that compresses and converts files entirely in the user's browser. No uploads to a server for processing — files never leave the device. Optional accounts let users keep a history of their conversions.

## Core principles

- **Privacy by default**: all processing runs client-side in the browser via WebAssembly libraries. Files are never uploaded for conversion.
- **Drop-and-go**: large drag-and-drop zone front and center, no signup required to use it.
- **Honest scope**: ship the formats we can do well in-browser. Office docs (DOCX/XLSX/PPTX) realistically need a server, so we'll scope them carefully (see below).

## Pages & layout

```text
┌──────────────────────────────────────────────┐
│  Squish                       [Sign in]      │
├──────────────────────────────────────────────┤
│   Compress and convert files in your browser │
│   Nothing is uploaded. Everything is private.│
│                                              │
│   ┌──────────────────────────────────────┐   │
│   │                                      │   │
│   │      Drop files here or click        │   │
│   │      Images · PDFs · Audio · Video   │   │
│   │                                      │   │
│   └──────────────────────────────────────┘   │
│                                              │
│   [Image] [PDF] [Audio] [Video] [Documents]  │
└──────────────────────────────────────────────┘
```

After dropping files, each row shows: thumbnail, name, original size → compressed size, format selector, quality slider, and a download button. Batch download as ZIP.

Routes:
- `/` — main tool (drop zone + file list)
- `/history` — past conversions (signed-in only)
- `/about` — privacy explanation
- `/auth` — sign in / sign up

## File type support

| Type | Operations | Library |
|------|-----------|---------|
| **Images** (JPG, PNG, WebP, AVIF, HEIC) | compress, convert, resize | `browser-image-compression` + `@jsquash/*` (WASM encoders for AVIF/WebP/JPEG/PNG) + `heic-to` for HEIC decode |
| **PDFs** | compress, merge, split, PDF↔images | `pdf-lib` + `pdfjs-dist` |
| **Audio** (MP3, WAV, M4A, OGG) | compress, convert | `@ffmpeg/ffmpeg` (ffmpeg.wasm), lazy-loaded |
| **Video** (MP4, WebM, MOV) | compress, convert, trim | `@ffmpeg/ffmpeg`, lazy-loaded |
| **Documents** (DOCX/XLSX/PPTX) | convert to PDF | scoped to **DOCX → PDF** and **DOCX → HTML** using `mammoth.js` + client-side rendering. Full Office conversion isn't realistic in-browser; we'll be upfront about that. |

ffmpeg.wasm is ~30 MB so it loads only when the user picks an audio/video file, with a clear progress indicator.

## Optional accounts (Lovable Cloud)

Anonymous use is fully featured. Signing in adds:
- **History**: list of past conversions (filename, original size, output size, format, date). Only metadata is stored — never the file contents.
- **Saved presets**: e.g. "Web JPEG 80%", "PDF max compress".

Tables (in Lovable Cloud):
- `profiles` (id, display_name, created_at)
- `conversions` (id, user_id, original_name, original_size, output_size, source_format, target_format, created_at)
- `presets` (id, user_id, name, config jsonb)
- `user_roles` + `app_role` enum (separate table, `has_role()` security-definer function — never store roles on profiles)

RLS: each table restricted to `auth.uid() = user_id`.

## About n8n

You mentioned you have n8n. Since we picked **fully in-browser** processing, n8n isn't on the critical path — but it's a good fit for optional add-ons later, e.g.:
- Webhook to email yourself a daily summary of conversions
- "Send compressed file to Google Drive / Dropbox" action

We'll leave clean integration points (a "Send to…" menu) so an n8n webhook can be wired in later without rework. Not built in v1.

## Visual style

Clean utility, TinyPNG-inspired but distinctive:
- Off-white background, near-black text, single bold accent color (a saturated lime/teal — TBD, not the AI-default purple).
- Distinctive typography: a geometric display font (e.g. Space Grotesk) for headings, Inter or system-ui for UI.
- Minimal motion: only the drop zone reacts (border + subtle scale on dragover) and per-file progress bars.
- Mobile-first; the drop zone becomes a tap-to-pick button on small screens (you're currently viewing at 411px).

## Technical implementation notes

- **State**: per-file processing state machine (`queued → processing → done | error`) using Zustand or React context. Web Workers for heavy work to keep the UI responsive.
- **Streaming**: process files one at a time for memory safety; show queue progress.
- **ZIP output**: `jszip` for batch downloads.
- **WASM hosting**: ffmpeg.wasm and jSquash WASM binaries served from `public/wasm/` per the project's WASM rules (client-only, never in SSR).
- **Limits**: hard cap at ~2 GB per file (browser memory); show a friendly error above that.
- **SEO**: H1 "Compress and convert files in your browser", meta description under 160 chars, JSON-LD `SoftwareApplication`.

## Build phases

1. **Foundation + Images** — design system, drop zone, image compress/convert (the most-used path).
2. **PDFs** — compress, merge, split, PDF↔image.
3. **Audio/Video** — lazy-loaded ffmpeg.wasm with progress UI.
4. **Documents** — DOCX → PDF/HTML via mammoth, with clear "limited support" messaging.
5. **Accounts + history** — Lovable Cloud, auth page, history page, presets.

We can stop after any phase and ship.
