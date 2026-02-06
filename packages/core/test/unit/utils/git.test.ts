import { describe, it, expect, vi } from "vitest";
import { cloneToTemp, resolveGitUrl } from "../../../src/utils/git.js";
import { existsSync } from "fs";

describe("cloneToTemp", () => {
  it("calls git clone with correct arguments", async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const result = await cloneToTemp(
      "https://github.com/example/repo",
      mockExec
    );

    expect(mockExec).toHaveBeenCalledOnce();
    const [cmd, args] = mockExec.mock.calls[0];
    expect(cmd).toBe("git");
    expect(args[0]).toBe("clone");
    expect(args[1]).toBe("--depth");
    expect(args[2]).toBe("1");
    expect(args[3]).toBe("https://github.com/example/repo");
    expect(typeof args[4]).toBe("string"); // temp dir path

    await result.cleanup();
  });

  it("returns a path that exists after successful clone", async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const result = await cloneToTemp(
      "https://github.com/example/repo",
      mockExec
    );

    expect(existsSync(result.path)).toBe(true);
    expect(typeof result.cleanup).toBe("function");

    await result.cleanup();
  });

  it("cleanup removes the temp directory", async () => {
    const mockExec = vi.fn().mockResolvedValue({ stdout: "", stderr: "" });
    const result = await cloneToTemp(
      "https://github.com/example/repo",
      mockExec
    );

    const tempPath = result.path;
    expect(existsSync(tempPath)).toBe(true);

    await result.cleanup();
    expect(existsSync(tempPath)).toBe(false);
  });

  it("cleans up and throws on clone failure", async () => {
    const mockExec = vi
      .fn()
      .mockRejectedValue(new Error("git clone failed: repository not found"));

    await expect(
      cloneToTemp("https://github.com/example/nonexistent", mockExec)
    ).rejects.toThrow("Failed to clone");

    // The temp dir should have been cleaned up
    // (We can't easily check the exact path since it was cleaned up,
    // but the function should not leak temp dirs)
  });
});

describe("resolveGitUrl", () => {
  it("resolves owner/repo shorthand to GitHub URL", () => {
    expect(resolveGitUrl("obra/superpowers-marketplace")).toBe(
      "https://github.com/obra/superpowers-marketplace.git"
    );
  });

  it("passes through full HTTPS URLs unchanged", () => {
    expect(resolveGitUrl("https://github.com/obra/superpowers.git")).toBe(
      "https://github.com/obra/superpowers.git"
    );
  });

  it("passes through git@ SSH URLs unchanged", () => {
    expect(resolveGitUrl("git@github.com:obra/superpowers.git")).toBe(
      "git@github.com:obra/superpowers.git"
    );
  });

  it("passes through HTTP URLs unchanged", () => {
    expect(resolveGitUrl("http://github.com/obra/superpowers")).toBe(
      "http://github.com/obra/superpowers"
    );
  });
});
