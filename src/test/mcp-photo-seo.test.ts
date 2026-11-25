import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import type { ToolContext } from "@lovable.dev/mcp-js";
import { readPhotoSeo, updatePhotoSeo } from "@/lib/mcp/photo-seo";
import { supabaseForUser } from "@/lib/mcp/supabase";

const original = { id: "photo-1", original_name: "photo.jpg", custom_name: null, metadata: { author: "Cade Bagley" }, revision: 2, updated_at: "2026-11-25T16:33:00Z" };
function mockClient(rows: unknown[]) {
  const builder = {
    select: vi.fn(), eq: vi.fn(), update: vi.fn(), abortSignal: vi.fn(), maybeSingle: vi.fn(),
  };
  for (const key of ["select", "eq", "update", "abortSignal"] as const) builder[key].mockReturnValue(builder);
  rows.forEach((data) => builder.maybeSingle.mockResolvedValueOnce({ data, error: null }));
  const client = { from: vi.fn().mockReturnValue(builder) } as unknown as SupabaseClient<Database>;
  return { client, builder };
}
describe("private remote photo SEO access", () => {
  it("refuses callers without verified identity instead of falling back to anonymous access", () => {
    const ctx = { isAuthenticated: () => false, getToken: () => undefined, getUserId: () => undefined } as unknown as ToolContext;
    expect(() => supabaseForUser(ctx)).toThrow("Sign in");
  });
  it("scopes reads to the verified owner and record", async () => {
    const { client, builder } = mockClient([original]);
    await readPhotoSeo(client, "owner-1", "photo-1");
    expect(builder.eq).toHaveBeenCalledWith("user_id", "owner-1");
    expect(builder.eq).toHaveBeenCalledWith("id", "photo-1");
  });
  it("returns a refusal for another account's inaccessible record", async () => {
    const { client } = mockClient([null]);
    await expect(readPhotoSeo(client, "owner-2", "photo-1")).rejects.toThrow("not accessible");
  });
  it("updates only the requested owner's current revision and preserves omitted SEO fields", async () => {
    const { client, builder } = mockClient([original, { ...original, revision: 3, metadata: { author: "Cade Bagley", title: "Boise river" } }]);
    await updatePhotoSeo(client, "owner-1", "photo-1", 2, { title: "Boise river" });
    expect(builder.update).toHaveBeenCalledWith({ metadata: { author: "Cade Bagley", title: "Boise river" } });
    expect(builder.eq).toHaveBeenCalledWith("user_id", "owner-1");
    expect(builder.eq).toHaveBeenCalledWith("revision", 2);
  });
  it("refuses stale revisions without writing", async () => {
    const { client, builder } = mockClient([original]);
    await expect(updatePhotoSeo(client, "owner-1", "photo-1", 1, { title: "Boise" })).rejects.toThrow("changed");
    expect(builder.update).not.toHaveBeenCalled();
  });
  it("refuses an update that loses a concurrent revision race", async () => {
    const { client } = mockClient([original, null]);
    await expect(updatePhotoSeo(client, "owner-1", "photo-1", 2, { title: "Boise" })).rejects.toThrow("changed");
  });
});