import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { NuOrderAuth, NuOrderAuthError } from "./services/auth.js";
import { NuOrderClient } from "./services/client.js";
import { isMockDomain } from "./constants.js";
import { registerOrderTools } from "./tools/orders.js";
import { registerCompanyTools } from "./tools/companies.js";
import { registerProductTools } from "./tools/products.js";

// Load credentials on startup unless running against the mock domain.
// The mock domain requires no OAuth credentials so we skip validation there.
let auth = null;
if (!isMockDomain()) {
  try {
    auth = NuOrderAuth.fromEnv();
  } catch (err) {
    if (err instanceof NuOrderAuthError) {
      process.stderr.write(`[drape-mcp-server] ${err.message}. Run /drape:setup to connect your account.\n`);
      // Continue without credentials — tools will return a setup prompt instead of crashing.
    } else {
      throw err;
    }
  }
}

const server = new McpServer({
  name: "drape-mcp-server",
  version: "0.1.0",
});

const client = new NuOrderClient(auth);
registerOrderTools(server, client);
registerCompanyTools(server, client);
registerProductTools(server, client);

const transport = new StdioServerTransport();
await server.connect(transport);
