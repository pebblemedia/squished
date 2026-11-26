import { Action, ActionPanel, Form, getSelectedFinderItems, popToRoot, showHUD, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { FORMATS, formatBytes, listLimits, type Format } from "squished";
import { isImage, squishPaths, summaryText } from "./lib/squish-paths";

const KB = 1024;
const MB = 1024 * KB;
const SIZES = [20 * KB, 50 * KB, 100 * KB, 200 * KB, 500 * KB, 1 * MB, 2 * MB, 5 * MB, 10 * MB, 25 * MB];
const sizeLabel = (b: number) => formatBytes(b).replace(".0 ", " ");

const DESTINATIONS = listLimits().filter((d) =>
  d.rules.some((r) => (r.kind === "image" || r.kind === "any") && r.maxBytes),
);

const FORMAT_LABELS: Record<Format, string> = { jpeg: "JPEG", png: "PNG", webp: "WebP", avif: "AVIF" };

interface Values {
  files: string[];
  fit: string;
  format: string;
}

export default function Command() {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSelectedFinderItems()
      .then((items) => setFiles(items.map((i) => i.path).filter(isImage)))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  async function submit(values: Values) {
    const paths = values.files.filter(isImage);
    if (!paths.length) {
      await showToast({ style: Toast.Style.Failure, title: "Pick at least one JPEG, PNG, WebP or AVIF image" });
      return;
    }
    const fit = values.fit.startsWith("size:") ? Number(values.fit.slice(5)) : values.fit.slice(5);
    const to = values.format === "original" ? undefined : (values.format as Format);
    const toast = await showToast({ style: Toast.Style.Animated, title: "Squishing…" });
    const summary = await squishPaths(paths, { fit, to }, (done, total) => {
      toast.message = `${done + 1} of ${total}`;
    });
    await showHUD(summaryText(summary));
    await popToRoot();
  }

  return (
    <Form
      isLoading={loading}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Squish" onSubmit={submit} />
        </ActionPanel>
      }
    >
      <Form.FilePicker id="files" title="Images" value={files} onChange={setFiles} allowMultipleSelection />
      <Form.Dropdown id="fit" title="Fit to" defaultValue={`size:${500 * KB}`}>
        <Form.Dropdown.Section title="File size">
          {SIZES.map((b) => (
            <Form.Dropdown.Item key={b} value={`size:${b}`} title={`Under ${sizeLabel(b)}`} />
          ))}
        </Form.Dropdown.Section>
        <Form.Dropdown.Section title="Upload limit">
          {DESTINATIONS.map((d) => (
            <Form.Dropdown.Item key={d.slug} value={`dest:${d.slug}`} title={d.name} keywords={[d.slug, d.group]} />
          ))}
        </Form.Dropdown.Section>
      </Form.Dropdown>
      <Form.Dropdown id="format" title="Format" defaultValue="original">
        <Form.Dropdown.Item value="original" title="Keep format" />
        {FORMATS.map((f) => (
          <Form.Dropdown.Item key={f} value={f} title={FORMAT_LABELS[f]} />
        ))}
      </Form.Dropdown>
      <Form.Description text="Files are compressed on this Mac and saved next to the originals with a -squished suffix." />
    </Form>
  );
}
