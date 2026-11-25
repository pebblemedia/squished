import { useWebMCP } from "use-webmcp-tool";
import { useQueue } from "@/store/queue";
import { seoFields, type SeoPatch } from "@/lib/seo-fields";
import { runWebMCPTool } from "@/lib/webmcp-telemetry";

const emptySchema = { type: "object", properties: {}, additionalProperties: false };
const editSchema = {
  type: "object", additionalProperties: false,
  properties: {
    id: { type: "string", description: "Image ID from list_visible_photo_seo." },
    customName: { type: "string", description: "Download name without extension; empty clears the custom name." },
    ...Object.fromEntries(Object.entries(seoFields).map(([key, field]) => [key, { type: "string", description: field.description }])),
  },
  required: ["id"],
};
const readAnnotations = { readOnlyHint: true, untrustedContentHint: true };

export function QueueAgentTools() {
  const visible = useQueue((s) => s.items);
  const savePhotoDetails = useQueue((s) => s.savePhotoDetails);
  useWebMCP({
    name: "list_visible_photo_seo",
    description: "Read the images and current SEO fields shown in the open file queue; does not upload anything.",
    inputSchema: emptySchema, annotations: readAnnotations,
    execute: () => runWebMCPTool("list_visible_photo_seo", () => {
      const images = visible.filter((item) => item.kind === "image");
      return images.length ? images.map((item) => `${item.id}: ${JSON.stringify({ name: item.name, customName: item.customName ?? "", ...item.meta })}`).join("\n") : "No images are shown in the current queue.";
    }),
  });
  useWebMCP<SeoPatch & { id: string }>({
    name: "fill_visible_photo_seo",
    description: "Fill an image's filename and SEO fields in the current queue; keeps omitted fields and leaves downloads to the user.",
    inputSchema: editSchema,
    execute: ({ id, ...fields }) => runWebMCPTool("fill_visible_photo_seo", () => {
      if (typeof id !== "string" || !visible.some((item) => item.id === id && item.kind === "image")) throw new Error("The image is not in the current view.");
      savePhotoDetails(id, fields);
      return "Photo SEO details updated in the browser. Original photos were not uploaded.";
    }),
  });
  return null;
}