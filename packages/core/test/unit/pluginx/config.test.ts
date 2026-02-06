import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { writeFile, mkdir, rm, readFile } from "fs/promises";
import { join } from "path";
import { tmpdir } from "os";
import {
  readConfig,
  writeConfig,
  checkConsent,
} from "../../../src/pluginx/config.js";

describe("pluginx/config", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `pluginx-config-test-${Date.now()}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe("readConfig", () => {
    it("reads valid config with bypass consent", async () => {
      const configPath = join(tmpDir, "config.json");
      await writeFile(configPath, JSON.stringify({ consentLevel: "bypass" }));
      const config = await readConfig(configPath);
      expect(config.consentLevel).toBe("bypass");
    });

    it("reads valid config with acknowledged consent", async () => {
      const configPath = join(tmpDir, "config.json");
      await writeFile(
        configPath,
        JSON.stringify({ consentLevel: "acknowledged" })
      );
      const config = await readConfig(configPath);
      expect(config.consentLevel).toBe("acknowledged");
    });

    it("returns empty object for missing file", async () => {
      const config = await readConfig(join(tmpDir, "nonexistent.json"));
      expect(config).toEqual({});
    });

    it("returns empty object for invalid JSON", async () => {
      const configPath = join(tmpDir, "config.json");
      await writeFile(configPath, "not json");
      const config = await readConfig(configPath);
      expect(config).toEqual({});
    });
  });

  describe("writeConfig", () => {
    it("writes config to specified path", async () => {
      const configPath = join(tmpDir, "config.json");
      await writeConfig({ consentLevel: "bypass" }, configPath);
      const raw = await readFile(configPath, "utf-8");
      const config = JSON.parse(raw);
      expect(config.consentLevel).toBe("bypass");
    });

    it("creates parent directories if needed", async () => {
      const configPath = join(tmpDir, "nested", "dir", "config.json");
      await writeConfig({ consentLevel: "acknowledged" }, configPath);
      const raw = await readFile(configPath, "utf-8");
      const config = JSON.parse(raw);
      expect(config.consentLevel).toBe("acknowledged");
    });

    it("overwrites existing config", async () => {
      const configPath = join(tmpDir, "config.json");
      await writeConfig({ consentLevel: "bypass" }, configPath);
      await writeConfig({ consentLevel: "declined" }, configPath);
      const raw = await readFile(configPath, "utf-8");
      const config = JSON.parse(raw);
      expect(config.consentLevel).toBe("declined");
    });
  });

  describe("checkConsent", () => {
    it("returns 'bypass' when consentLevel is bypass", async () => {
      const configPath = join(tmpDir, "config.json");
      await writeFile(configPath, JSON.stringify({ consentLevel: "bypass" }));
      expect(await checkConsent(configPath)).toBe("bypass");
    });

    it("returns 'acknowledged' when consentLevel is acknowledged", async () => {
      const configPath = join(tmpDir, "config.json");
      await writeFile(
        configPath,
        JSON.stringify({ consentLevel: "acknowledged" })
      );
      expect(await checkConsent(configPath)).toBe("acknowledged");
    });

    it("returns 'required' when consentLevel is declined", async () => {
      const configPath = join(tmpDir, "config.json");
      await writeFile(
        configPath,
        JSON.stringify({ consentLevel: "declined" })
      );
      expect(await checkConsent(configPath)).toBe("required");
    });

    it("returns 'required' when config file is missing", async () => {
      expect(await checkConsent(join(tmpDir, "missing.json"))).toBe(
        "required"
      );
    });
  });
});
