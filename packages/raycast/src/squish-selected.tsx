import { getSelectedFinderItems, showHUD, showToast, Toast } from "@raycast/api";
import { isImage, squishPaths, summaryText } from "./lib/squish-paths";

export default async function Command() {
  let paths: string[];
  try {
    paths = (await getSelectedFinderItems()).map((i) => i.path).filter(isImage);
  } catch {
    await showHUD("Select some images in Finder first");
    return;
  }
  if (!paths.length) {
    await showHUD("No JPEG, PNG, WebP or AVIF images selected");
    return;
  }
  const toast = await showToast({ style: Toast.Style.Animated, title: `Squishing ${paths.length} image${paths.length === 1 ? "" : "s"}…` });
  const summary = await squishPaths(paths, {}, (done, total) => {
    toast.message = `${done + 1} of ${total}`;
  });
  await showHUD(summaryText(summary));
}
