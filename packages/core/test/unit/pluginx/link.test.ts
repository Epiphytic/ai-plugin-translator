import { describe, it, expect, vi, beforeEach } from "vitest";
import { linkExtension } from "../../../src/pluginx/link.js";

describe("pluginx/link", () => {
  const mockExec = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });

  beforeEach(() => {
    mockExec.mockReset().mockResolvedValue({ stdout: "", stderr: "" });
  });

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

  it("uninstalls and re-links when already installed", async () => {
    mockExec
      .mockRejectedValueOnce({ stderr: 'Extension "my-ext" is already installed. Please uninstall it first.' })
      .mockResolvedValueOnce({ stdout: "", stderr: "" }) // uninstall
      .mockResolvedValueOnce({ stdout: "", stderr: "" }); // re-link

    await linkExtension("/tmp/translations/my-ext", false, mockExec);

    expect(mockExec).toHaveBeenCalledTimes(3);
    expect(mockExec).toHaveBeenNthCalledWith(1, "gemini", [
      "extensions",
      "link",
      "/tmp/translations/my-ext",
    ]);
    expect(mockExec).toHaveBeenNthCalledWith(2, "gemini", [
      "extensions",
      "uninstall",
      "my-ext",
    ]);
    expect(mockExec).toHaveBeenNthCalledWith(3, "gemini", [
      "extensions",
      "link",
      "/tmp/translations/my-ext",
    ]);
  });

  it("re-throws non-already-installed errors", async () => {
    mockExec.mockRejectedValueOnce({ stderr: "some other error" });

    await expect(
      linkExtension("/tmp/output", false, mockExec)
    ).rejects.toEqual({ stderr: "some other error" });
  });
});
