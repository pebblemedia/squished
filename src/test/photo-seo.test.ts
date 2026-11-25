import { beforeEach, describe, expect, it } from "vitest";
import { photoDetailsPatch } from "@/lib/seo-fields";
import { useQueue } from "@/store/queue";

describe("photo SEO field edits", () => {
  it.each([
    ["title", "Boise river sunset"],
    ["description", "Sunset over the Boise River"],
    ["keywords", "boise, river, sunset"],
    ["author", "Cade Bagley"],
    ["copyright", "Copyright 2026 Cade Bagley"],
    ["location", "Boise, Idaho"],
    ["latitude", "43.615000"],
    ["longitude", "-116.202300"],
  ])("allows an agent to fill %s", (field, value) => {
    const patch = photoDetailsPatch("photo.jpg", { title: "Existing" }, { [field]: value });
    expect(patch.meta).toHaveProperty(field, value);
  });
  it("renames the download using the same normalization as the form", () => {
    expect(photoDetailsPatch("photo.jpg", {}, { customName: "  boise-river-sunset  " }).customName).toBe("boise-river-sunset");
  });
  it("preserves fields omitted by an agent", () => {
    expect(photoDetailsPatch("photo.jpg", { author: "Cade Bagley", location: "Boise, Idaho" }, { title: "Boise sunset" }).meta)
      .toEqual({ author: "Cade Bagley", location: "Boise, Idaho", title: "Boise sunset" });
  });
  it("clears a field only when explicit empty text is supplied", () => {
    expect(photoDetailsPatch("photo.jpg", { location: "Boise" }, { location: "" }).meta.location).toBe("");
  });
  it.each([{ title: null }, { latitude: 43.6 }, { title: "valid", user_id: "another-user" }, {}])("rejects invalid input without accepting partial changes", (fields) => {
    expect(() => photoDetailsPatch("photo.jpg", { title: "Original" }, fields)).toThrow();
  });
});

describe("browser agent queue boundaries", () => {
  beforeEach(() => {
    useQueue.setState({ items: [{
      id: "visible-photo", name: "photo.jpg", file: new File(["photo"], "photo.jpg", { type: "image/jpeg" }),
      kind: "image", status: "done", originalSize: 5, progress: 100, targetFormat: "jpeg", quality: 0.75,
      meta: { author: "Cade Bagley" },
    }] });
  });
  it("refuses hidden or removed image targets", () => {
    expect(() => useQueue.getState().savePhotoDetails("hidden-photo", { title: "Changed" })).toThrow("not in the current view");
    expect(useQueue.getState().items[0].meta).toEqual({ author: "Cade Bagley" });
  });
  it("refuses photo SEO writes on non-images", () => {
    useQueue.setState({ items: useQueue.getState().items.map((item) => ({ ...item, kind: "audio" })) });
    expect(() => useQueue.getState().savePhotoDetails("visible-photo", { title: "Changed" })).toThrow("images only");
  });
  it("validates every field before updating the visible photo", () => {
    expect(() => useQueue.getState().savePhotoDetails("visible-photo", { title: "Changed", longitude: 3 })).toThrow();
    expect(useQueue.getState().items[0].meta).toEqual({ author: "Cade Bagley" });
  });
});