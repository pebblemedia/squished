## Goal

Mirror CloudConvert's SEO playbook: a dedicated, indexable landing page for every common task (e.g. "Compress MP3", "Convert PNG to JPG", "Compress MP4"). Each page targets a specific keyword, ranks on its own, and funnels users into the existing in-browser Squished tool — pre-configured for that task.

## Approach

Generate pages programmatically from a single config so we don't hand-write 50+ files. Each page:

- Lives at a clean URL (e.g. `/compress-mp3`, `/convert-png-to-jpg`, `/compress-mp4`)
- Has a unique H1, meta title, meta description, and intro copy keyed off the task
- Reuses the existing DropZone + queue, but pre-filters/locks the accepted format and target so the user lands ready to go
- Includes an FAQ block, "How it works" steps, and internal links to related tools (huge for SEO)
- Adds JSON-LD `SoftwareApplication` + `FAQPage` structured data
- All pages link to each other via a "All tools" hub page (`/tools`) and a footer grid — internal linking is what makes pSEO work

## Page set (v1)

**Compress** (8): mp3, wav, m4a, ogg, mp4, webm, jpg, png, webp
**Convert audio** (12): mp3↔wav, mp3↔m4a, wav↔m4a, mp3↔ogg, m4a↔mp3, wav→mp3, etc.
**Convert video** (2): mp4↔webm
**Convert image** (6): png↔jpg, png↔webp, jpg↔webp
**Hub**: `/tools` listing everything, grouped

~28 pages from one template. Easy to expand later.

## Page structure (each landing page)

```text
[Header — same as home]
H1: Compress MP3 online — free, private, in your browser
Subhead: One-sentence value prop tuned to the task
[DropZone — accepts only .mp3, target locked to MP3 + bitrate selector]
[3-step "How it works" strip]
[FAQ: 4–6 Q&As — "Is it free?", "Are my files uploaded?", "What bitrate should I use?", etc.]
[Related tools grid: 6 internal links]
[Footer — same as home, with full tool sitemap]
```

## Technical plan

### 1. Tool config (`src/lib/tools.ts`)

Single source of truth. One entry per page:

```ts
{
  slug: "compress-mp3",
  kind: "compress",
  category: "audio",
  inputExt: ["mp3"],
  targetFormat: "mp3",
  title: "Compress MP3 Online — Free & Private | Squished",
  h1: "Compress MP3 files in your browser",
  description: "Shrink MP3 files up to 80% without uploading...",
  faq: [{ q: "...", a: "..." }, ...],
  related: ["compress-wav", "convert-mp3-to-m4a", ...],
}
```

### 2. Single dynamic route

In `App.tsx`, add `<Route path="/:slug" element={<ToolPage />} />` (kept above the `*` catch-all). `ToolPage` looks up the slug in the config; unknown slug → `NotFound`.

### 3. `ToolPage` component (`src/pages/ToolPage.tsx`)

- Renders the template above using config
- Uses `react-helmet-async` for per-page `<title>`, meta description, canonical, Open Graph, and JSON-LD (`SoftwareApplication` + `FAQPage`)
- Filters DropZone to `inputExt`; pre-sets `targetFormat` on new queue items
- Passes a "lockedTarget" prop to `FileRow` (or just defaults the format) so users still land on the right output

### 4. Hub page (`src/pages/Tools.tsx`)

`/tools` — grid of every tool grouped by category. Linked from header and footer.

### 5. Home page

Add a "Popular tools" section linking to ~12 top pages — gives the homepage internal-link juice and helps Google discover them.

### 6. SEO infrastructure

- `react-helmet-async` for per-page meta (install)
- Generate `public/sitemap.xml` at build time via a tiny Vite plugin or a prebuild script that reads `tools.ts` and writes the file. Include `/`, `/tools`, and every tool slug.
- Update `public/robots.txt` to reference the sitemap
- Add canonical tags
- Pre-render: optional but recommended later — vanilla Vite SPAs serve an empty shell to crawlers. Google generally renders JS now, but for best ranking we'd add `vite-plugin-ssg` or `react-snap` in a follow-up. v1 ships with helmet + sitemap (works, just slightly weaker than pre-rendered HTML).

### 7. Schema additions

`TargetFormat` already covers all needed formats. Minor: extend `DropZone` to accept an optional `accept` prop forwarded to the file input so each page only takes its format.

## Out of scope for v1

- Pre-rendering / SSG (separate follow-up)
- Blog / article pages
- Localized (multi-language) URLs
- PDF tools (none implemented yet)

## Files touched / created

- create `src/lib/tools.ts` — config for all pages
- create `src/pages/ToolPage.tsx` — dynamic landing page template
- create `src/pages/Tools.tsx` — hub page
- create `src/components/seo/Seo.tsx` — helmet wrapper + JSON-LD helper
- create `src/components/seo/Faq.tsx`, `HowItWorks.tsx`, `RelatedTools.tsx`
- edit `src/App.tsx` — add `/tools` and `/:slug` routes, wrap with `HelmetProvider`
- edit `src/pages/Index.tsx` — add "Popular tools" section + footer tool grid
- edit `src/components/DropZone.tsx` — optional `accept` prop
- create `scripts/generate-sitemap.ts` + wire into `package.json` build
- edit `public/robots.txt` — add sitemap line
- install `react-helmet-async`

## Outcome

Every supported task gets its own ranking-ready URL with unique copy, FAQ, structured data, and a dense internal-link graph — same pattern CloudConvert uses to rank for hundreds of "compress X" / "convert X to Y" queries.
