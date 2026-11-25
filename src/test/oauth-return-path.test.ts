import { describe, expect, it } from "vitest";
import { oauthReturnPath } from "@/lib/oauth-return-path";

describe("safe OAuth consent returns", () => {
  it("preserves the complete consent path, authorization ID, and fragment", () => {
    const next = "/.lovable/oauth/consent?authorization_id=claude-authorization#approve";
    expect(oauthReturnPath(next)).toBe(next);
  });
  it.each(["https://outside.invalid", "//outside.invalid", "/\\outside.invalid/", "/\noutside.invalid", null])("rejects external or malformed return paths", (next) => {
    expect(oauthReturnPath(next)).toBe("/");
  });
});