import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { NuOrderAuth, NuOrderAuthError } from "./services/auth.js";
import { NuOrderClient } from "./services/client.js";
import { isMockDomain } from "./constants.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerCompanyTools } from "./tools/companies.js";
import { registerProductTools } from "./tools/products.js";

// Validate credentials on startup unless running against the mock domain.
// The mock domain requires no OAuth credentials so we skip validation there.
if (!isMockDomain()) {
  try {
    NuOrderAuth.fromEnv();
  } catch (err) {
    if (err instanceof NuOrderAuthError) {
      process.stderr.write(`[nuorder-mcp-server] Startup error: ${err.message}\n`);
      process.exit(1);
    }
    throw err;
  }
}

const server = new McpServer({
  name: "nuorder-mcp-server",
  version: "0.1.0",
});

const client = new NuOrderClient();
registerOrderTools(server, client);
registerCompanyTools(server, client);
registerProductTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
