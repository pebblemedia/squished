import { useWebMCP } from "use-webmcp-tool";
import { useQueue } from "@/store/queue";
import { formatAllowed, formatBytes, type TargetFormat } from "@/lib/files";
import { fitFieldsFor, type FitChoice } from "@/lib/fit";
import { DESTINATIONS, DESTINATIONS_BY_SLUG } from "@/lib/destinations";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";
import { buildPhotoSeo, DEFAULT_PATTERN } from "@/features/local-seo/api/seo-template";
import { applySeo } from "@/features/local-seo/api/apply";
import { geocode } from "@/features/local-seo/api/geocode";
import type { BusinessProfile } from "@/features/local-seo/api/business-profile";

const FORMATS = ["original", "jpeg", "png", "webp", "avif", "strip", "pdf", "mp3", "m4a", "ogg", "wav", "mp4", "webm", "pdf-to-jpg", "pdf-to-png"];
const str = (description: string) => ({ type: "string", description });
const readOnly = { readOnlyHint: true, untrustedContentHint: true };

type OptionsArgs = { ids?: string[]; format?: TargetFormat; quality?: number; fit_kb?: number; fit_destination?: string; no_fit?: boolean };
type SeoArgs = { business_name?: string; city?: string; services?: string; address?: string; latitude?: string; longitude?: string; author?: string; copyright?: string; pattern?: string; ids?: string[]; save_as_jpeg?: boolean };

function fitFrom(a: OptionsArgs): FitChoice | undefined {
  if (a.no_fit) return { type: "none" };
  if (a.fit_destination) {
    if (!DESTINATIONS_BY_SLUG[a.fit_destination]) throw new Error("Unknown destination. Call list_upload_limits for valid slugs.");
    return { type: "dest", slug: a.fit_destination };
  }
  if (a.fit_kb !== undefined) {
    if (!(a.fit_kb > 0)) throw new Error("fit_kb must be a positive number.");
    return { type: "size", bytes: Math.round(a.fit_kb * 1024) };
  }
  return undefined;
}

/** Browser-local tools for agents on the queue screens: inspect files, change settings, run local SEO. Nothing is uploaded. */
export function QueueFileTools() {
  const items = useQueue((s) => s.items);

  useWebMCP({
    name: "list_visible_files",
    description: "List the files in the open Squished queue with kind, status, sizes, target format and size limit. Reads this page only.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: readOnly,
    execute: () => runWebMCPTool("list_visible_files", () => items.length
      ? items.map((i) => `${i.id}: ${JSON.stringify({
          name: i.name, kind: i.kind, status: i.status, error: i.error, format: i.targetFormat,
          before: formatBytes(i.originalSize), after: i.outputSize ? formatBytes(i.outputSize) : undefined,
          limit: i.targetBytes ? `${formatBytes(i.targetBytes)}${i.fitLabel ? ` (${i.fitLabel})` : ""}` : undefined,
        })}`).join("\n")
      : "The queue is empty."),
  });

  useWebMCP<OptionsArgs>({
    name: "set_visible_file_options",
    description: "Change format, quality or size limit for files in the open queue (all files when ids is omitted), then re-process them on this device. Formats a file can't use are skipped.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        ids: { type: "array", items: { type: "string" }, description: "File IDs from list_visible_files; omit for all files." },
        format: { type: "string", enum: FORMATS, description: "Target format." },
        quality: { type: "number", minimum: 0.1, maximum: 1, description: "Quality 0.1–1 (ignored when a size limit is set)." },
        fit_kb: { type: "number", description: "Make each file fit under this many KB." },
        fit_destination: str("Destination slug from list_upload_limits, e.g. gmail, discord, etsy."),
        no_fit: { type: "boolean", description: "Remove any size limit." },
      },
    },
    execute: (args) => runWebMCPTool("set_visible_file_options", () => {
      const fit = fitFrom(args);
      const { updateOptions, process, items: current } = useQueue.getState();
      const targets = args.ids?.length ? current.filter((i) => args.ids?.includes(i.id)) : current;
      if (!targets.length) throw new Error("No matching files in the queue.");
      let changed = 0;
      for (const it of targets) {
        const format = args.format && formatAllowed(it.kind, args.format) ? args.format : undefined;
        if (!format && !fit && args.quality === undefined) continue;
        updateOptions(it.id, {
          ...(format ? { targetFormat: format } : {}),
          ...(args.quality !== undefined ? { quality: Math.min(1, Math.max(0.1, args.quality)) } : {}),
          ...(fit ? fitFieldsFor(fit, it.kind) : {}),
        });
        void process(it.id);
        changed++;
      }
      return `Updated ${changed} of ${targets.length} file(s); they're re-processing in the browser.`;
    }),
  });

  useWebMCP<{ query?: string }>({
    name: "list_upload_limits",
    description: "Known upload size limits for email, chat, social, marketplace and form platforms, with slugs usable as fit_destination.",
    inputSchema: { type: "object", additionalProperties: false, properties: { query: str("Optional filter, e.g. 'gmail' or 'social'.") } },
    annotations: { readOnlyHint: true },
    execute: ({ query }) => runWebMCPTool("list_upload_limits", () => {
      const q = query?.trim().toLowerCase();
      const list = DESTINATIONS.filter((d) => !q || `${d.slug} ${d.name} ${d.group}`.toLowerCase().includes(q));
      return list.map((d) => `${d.slug}: ${d.name} — ${d.rules.map((r) => `${r.kind} ${r.maxBytes ? formatBytes(r.maxBytes) : "no size cap"}${r.maxWidth ? ` max ${r.maxWidth}×${r.maxHeight}` : ""}`).join("; ")}`).join("\n") || "No matching destinations.";
    }),
  });

  useWebMCP<SeoArgs>({
    name: "apply_local_seo_to_visible_photos",
    description: "Name, title, describe, keyword and geotag photos in the open queue for one business, written into the downloaded JPEGs. Only an address (if given without coordinates) is looked up via OpenStreetMap; photos are not uploaded.",
    inputSchema: {
      type: "object", additionalProperties: false,
      properties: {
        business_name: str("Business name."), city: str("City, e.g. 'Boise, ID'."),
        services: str("Comma-separated services or keywords, rotated across photos."),
        address: str("Street address."), latitude: str("Latitude."), longitude: str("Longitude."),
        author: str("Photo author."), copyright: str("Copyright line."),
        pattern: str(`Filename pattern; tokens {keyword} {city} {business} {original} {n}. Default ${DEFAULT_PATTERN}.`),
        ids: { type: "array", items: { type: "string" }, description: "Photo IDs; omit for all photos." },
        save_as_jpeg: { type: "boolean", description: "Convert non-JPEG photos to JPEG so details are embedded (default true)." },
      },
    },
    execute: (a) => runWebMCPTool("apply_local_seo_to_visible_photos", async () => {
      const photos = useQueue.getState().items.filter((i) => i.kind === "image" && (!a.ids?.length || a.ids.includes(i.id)));
      if (!photos.length) throw new Error("No photos in the queue.");
      const profile: BusinessProfile = {
        id: "agent", name: a.business_name ?? "", city: a.city ?? "", services: a.services ?? "",
        address: a.address ?? "", latitude: a.latitude ?? "", longitude: a.longitude ?? "", author: a.author, copyright: a.copyright,
      };
      if (!(profile.name || profile.city || profile.services)) throw new Error("Give at least a business name, city or services.");
      if (profile.address && !(profile.latitude && profile.longitude)) {
        const hit = await geocode([profile.address, profile.city].filter(Boolean).join(", ")).catch(() => null);
        if (hit) Object.assign(profile, { latitude: hit.latitude, longitude: hit.longitude });
      }
      const patches = photos.map((p, index) => ({
        id: p.id, fields: buildPhotoSeo(profile, { index, total: photos.length, originalName: p.name, pattern: a.pattern || DEFAULT_PATTERN }),
      }));
      const n = applySeo(patches, a.save_as_jpeg !== false);
      return `Applied local SEO to ${n} photo(s)${profile.latitude ? " with GPS" : ""}. The user downloads them as usual.`;
    }),
  });

  return null;
}
