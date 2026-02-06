import { describe, it, expect } from "vitest";
import {
  parseClaudeMcpFile,
  parseClaudeMcpFromObject,
} from "../../../../src/adapters/claude/parsers/mcp.js";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixtures = join(__dirname, "../../../fixtures/claude-plugins");

describe("parseClaudeMcpFile", () => {
  it("parses stdio MCP servers from .mcp.json", async () => {
    const servers = await parseClaudeMcpFile(join(fixtures, "full"));
    const stdio = servers.find((s) => s.name === "my-mcp");
    expect(stdio).toBeDefined();
    expect(stdio!.type).toBe("stdio");
    expect(stdio!.command).toBe("npx");
    expect(stdio!.args).toEqual(["-y", "@example/mcp-server"]);
  });

  it("parses HTTP MCP servers from .mcp.json", async () => {
    const servers = await parseClaudeMcpFile(join(fixtures, "full"));
    const http = servers.find((s) => s.name === "http-server");
    expect(http).toBeDefined();
    expect(http!.type).toBe("http");
    expect(http!.url).toBe("https://api.example.com/mcp");
    expect(http!.headers).toEqual({
      Authorization: "Bearer ${MY_API_KEY}",
    });
  });

  it("returns empty array when no .mcp.json exists", async () => {
    const servers = await parseClaudeMcpFile(join(fixtures, "basic"));
    expect(servers).toEqual([]);
  });
});

describe("parseClaudeMcpFromObject", () => {
  it("parses embedded mcpServers from plugin.json", () => {
    const embedded = {
      "my-server": {
        command: "node",
        args: ["server.js"],
        env: { FOO: "bar" },
      },
    };
    const servers = parseClaudeMcpFromObject(embedded);
    expect(servers).toHaveLength(1);
    expect(servers[0].name).toBe("my-server");
    expect(servers[0].env).toEqual({ FOO: "bar" });
  });
});
