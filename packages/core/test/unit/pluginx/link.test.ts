import { describe, it, expect, vi } from "vitest";
import { linkExtension } from "../../../src/pluginx/link.js";

describe("pluginx/link", () => {
  const mockExec = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });

  it("calls gemini extensions link without --consent", async () => {
    await linkExtension("/tmp/output", false, mockExec);
    expect(mockExec).toHaveBeenCalledWith("gemini", [
      "extensions",
      "link",
      "/tmp/output",
    ]);
  });

  it("calls gemini extensions link with --consent", async () => {
    await linkExtension("/tmp/output", true, mockExec);
    expect(mockExec).toHaveBeenCalledWith("gemini", [
      "extensions",
      "link",
      "--consent",
      "/tmp/output",
    ]);
  });
});
