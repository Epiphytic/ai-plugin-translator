import { describe, it, expect } from "vitest";
import { defaultExec, type ExecFn } from "../../../src/pluginx/exec-utils.js";

describe("pluginx/exec-utils", () => {
  describe("defaultExec", () => {
    it("runs a command and returns stdout/stderr", async () => {
      const result = await defaultExec("echo", ["hello"]);
      expect(result.stdout.trim()).toBe("hello");
      expect(result.stderr).toBe("");
    });

    it("rejects on non-zero exit code", async () => {
      await expect(defaultExec("false", [])).rejects.toThrow();
    });
  });

  describe("ExecFn type", () => {
    it("is compatible with mock functions", () => {
      const mock: ExecFn = async () => ({ stdout: "", stderr: "" });
      expect(typeof mock).toBe("function");
    });
  });
});
