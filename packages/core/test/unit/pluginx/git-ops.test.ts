import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rm } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  clonePersistent,
  pullLatest,
  getCurrentCommit,
} from "../../../src/pluginx/git-ops.js";

describe("pluginx/git-ops", () => {
  const mockExec = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockExec.mockResolvedValue({ stdout: "", stderr: "" });
  });

  describe("clonePersistent", () => {
    it("clones to sources dir with resolved URL", async () => {
      const result = await clonePersistent(
        "owner/repo",
        "repo",
        mockExec
      );

      expect(mockExec).toHaveBeenCalledWith("git", [
        "clone",
        "--depth",
        "1",
        "https://github.com/owner/repo.git",
        expect.stringContaining("repo"),
      ]);
      expect(result).toContain("repo");
    });

    it("passes full URLs through unchanged", async () => {
      await clonePersistent(
        "https://github.com/test/thing.git",
        "thing",
        mockExec
      );

      expect(mockExec).toHaveBeenCalledWith("git", [
        "clone",
        "--depth",
        "1",
        "https://github.com/test/thing.git",
        expect.stringContaining("thing"),
      ]);
    });
  });

  describe("pullLatest", () => {
    it("runs git pull in repo dir", async () => {
      await pullLatest("/tmp/repo", mockExec);
      expect(mockExec).toHaveBeenCalledWith("git", [
        "-C",
        "/tmp/repo",
        "pull",
      ]);
    });
  });

  describe("getCurrentCommit", () => {
    it("returns trimmed commit hash", async () => {
      mockExec.mockResolvedValue({
        stdout: "abc123def456\n",
        stderr: "",
      });
      const commit = await getCurrentCommit("/tmp/repo", mockExec);
      expect(commit).toBe("abc123def456");
    });
  });
});
