import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveSource, getSourceCommit } from "../../../src/pluginx/resolve-source.js";
import { tmpdir } from "os";
import { join } from "path";
import { mkdir, rm } from "fs/promises";

describe("pluginx/resolve-source", () => {
  const mockExec = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockExec.mockResolvedValue({ stdout: "", stderr: "" });
  });

  describe("resolveSource", () => {
    it("resolves a git source (owner/repo shorthand)", async () => {
      const result = await resolveSource("owner/my-plugin", mockExec);
      expect(result.name).toBe("my-plugin");
      expect(result.sourceType).toBe("git");
      expect(result.sourceUrl).toBe("owner/my-plugin");
      expect(result.sourcePath).toContain("my-plugin");
      expect(mockExec).toHaveBeenCalledWith(
        "git",
        expect.arrayContaining(["clone"])
      );
    });

    it("resolves a local path", async () => {
      const tmpDir = join(tmpdir(), `resolve-source-test-${Date.now()}`);
      await mkdir(tmpDir, { recursive: true });
      try {
        const result = await resolveSource(tmpDir, mockExec);
        expect(result.sourceType).toBe("local");
        expect(result.sourcePath).toBe(tmpDir);
        expect(result.sourceUrl).toBeUndefined();
        expect(mockExec).not.toHaveBeenCalled();
      } finally {
        await rm(tmpDir, { recursive: true, force: true });
      }
    });

    it("derives name from git URL", async () => {
      const result = await resolveSource(
        "https://github.com/user/cool-plugin.git",
        mockExec
      );
      expect(result.name).toBe("cool-plugin");
    });
  });

  describe("getSourceCommit", () => {
    it("returns commit hash for git sources", async () => {
      mockExec.mockResolvedValue({ stdout: "abc123\n", stderr: "" });
      const commit = await getSourceCommit("/tmp/repo", "git", mockExec);
      expect(commit).toBe("abc123");
    });

    it("returns undefined for local sources", async () => {
      const commit = await getSourceCommit("/tmp/local", "local", mockExec);
      expect(commit).toBeUndefined();
      expect(mockExec).not.toHaveBeenCalled();
    });

    it("returns undefined on git error", async () => {
      mockExec.mockRejectedValue(new Error("git failed"));
      const commit = await getSourceCommit("/tmp/repo", "git", mockExec);
      expect(commit).toBeUndefined();
    });
  });
});
