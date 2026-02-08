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

const server = new McpServer({
  name: "pluginx",
  version: "1.0.0",
});

registerAddTool(server);
registerAddMarketplaceTool(server);
registerListTool(server);
registerStatusTool(server);
registerUpdateTool(server);
registerUpdateAllTool(server);
registerRemoveTool(server);
registerConsentTool(server);

const transport = new StdioServerTransport();
await server.connect(transport);
