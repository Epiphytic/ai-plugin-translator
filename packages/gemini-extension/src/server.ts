#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerAddTool } from "./tools/add.js";
import { registerAddMarketplaceTool } from "./tools/add-marketplace.js";
import { registerListTool } from "./tools/list.js";
import { registerStatusTool } from "./tools/status.js";
import { registerUpdateTool } from "./tools/update.js";
import { registerUpdateAllTool } from "./tools/update-all.js";
import { registerRemoveTool } from "./tools/remove.js";
import { registerConsentTool } from "./tools/consent.js";

const mcpServer = new McpServer(
  {
    name: "pluginx",
    version: "1.0.0",
  },
  {
    capabilities: { logging: {} },
  }
);

function createLogger() {
  return (message: string) => {
    mcpServer.server.sendLoggingMessage({
      level: "info",
      logger: "pluginx",
      data: message,
    }).catch(() => {
      // Ignore logging errors - don't break tool execution
    });
  };
}

const log = createLogger();

registerAddTool(mcpServer, log);
registerAddMarketplaceTool(mcpServer, log);
registerListTool(mcpServer);
registerStatusTool(mcpServer);
registerUpdateTool(mcpServer, log);
registerUpdateAllTool(mcpServer, log);
registerRemoveTool(mcpServer);
registerConsentTool(mcpServer);

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
