import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NuOrderClient, NuOrderNotFoundError, NuOrderApiError } from "../services/client.js";
import { NuOrderProduct, NuOrderInventory, NuOrderCatalog, NuOrderPaginatedResponse } from "../types.js";
import {
  API_V1,
  API_V3_1,
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
  PAGINATION_CURSOR_PARAM,
  PAGINATION_LIMIT_PARAM,
} from "../constants.js";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
} as const;

export function registerProductTools(server: McpServer, client: NuOrderClient): void {
  // nuorder_list_products
  server.tool(
    "nuorder_list_products",
    "List catalogue products with pagination. Returns product names, style numbers, prices, and seasons.",
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(PAGINATION_MAX_LIMIT)
        .optional()
        .default(PAGINATION_DEFAULT_LIMIT)
        .describe(`Number of products per page (1–${PAGINATION_MAX_LIMIT}, default ${PAGINATION_DEFAULT_LIMIT}).`),
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response (__last_id) to fetch the next page."),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ limit, cursor }) => {
      try {
        const params: Record<string, string | number | boolean> = {
          [PAGINATION_LIMIT_PARAM]: limit ?? PAGINATION_DEFAULT_LIMIT,
        };
        if (cursor) params[PAGINATION_CURSOR_PARAM] = cursor;

        const result = await client.get<NuOrderPaginatedResponse<NuOrderProduct>>(
          `${API_V1}/products/list`,
          { params }
        );

        const products = result.data ?? (result as unknown as NuOrderProduct[]);
        const lastId = result.__last_id;
        const total = result.total;

        const lines: string[] = [];
        if (Array.isArray(products) && products.length > 0) {
          for (const p of products) {
            let line = `• ${p.name}  id=${p._id}`;
            if (p.style_number) line += `  style=${p.style_number}`;
            if (p.season) line += `  season=${p.season}`;
            if (p.year) line += `  year=${p.year}`;
            if (p.wholesale_price !== undefined) line += `  wholesale=${p.wholesale_price}`;
            lines.push(line);
          }
        } else {
          lines.push("No products found.");
        }

        const meta: string[] = [];
        if (total !== undefined) meta.push(`Total: ${total}`);
        if (lastId) meta.push(`Next page cursor: ${lastId}`);
        if (meta.length) lines.push("", meta.join("  ·  "));

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: formatError(err, "listing products") }],
          isError: true,
        };
      }
    }
  );

  // nuorder_get_inventory
  server.tool(
    "nuorder_get_inventory",
    "Get inventory/stock levels for a product by NuOrder product ID or external ID. Returns quantity per SKU/size.",
    {
      product_id: z
        .string()
        .min(1)
        .optional()
        .describe("The NuOrder internal product ID (_id). Use this or external_id."),
      external_id: z
        .string()
        .min(1)
        .optional()
        .describe("The brand's own external/style ID for the product. Use this or product_id."),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ product_id, external_id }) => {
      if (!product_id && !external_id) {
        return {
          content: [{
            type: "text" as const,
            text: "Provide either product_id or external_id.",
          }],
          isError: true,
        };
      }
      try {
        let path: string;
        if (product_id) {
          path = `${API_V1}/inventory/${encodeURIComponent(product_id)}`;
        } else {
          path = `${API_V1}/inventory/external_id/${encodeURIComponent(external_id!)}`;
        }

        const inventory = await client.get<NuOrderInventory>(path);
        return { content: [{ type: "text" as const, text: formatInventory(inventory) }] };
      } catch (err) {
        if (err instanceof NuOrderNotFoundError) {
          const id = product_id ?? external_id;
          return {
            content: [{
              type: "text" as const,
              text: `Inventory not found for ${product_id ? `product_id "${id}"` : `external_id "${id}"`}. Use nuorder_list_products to browse products.`,
            }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: formatError(err, "fetching inventory") }],
          isError: true,
        };
      }
    }
  );

  // nuorder_list_catalogs
  server.tool(
    "nuorder_list_catalogs",
    "List all line sheet catalogs via the NuOrder v3.1 API. Returns catalog names, seasons, statuses, and entry counts.",
    {},
    READ_ONLY_ANNOTATIONS,
    async () => {
      try {
        const result = await client.get<NuOrderPaginatedResponse<NuOrderCatalog> | NuOrderCatalog[]>(
          `${API_V3_1}/catalogs`
        );

        const catalogs: NuOrderCatalog[] = Array.isArray(result)
          ? result
          : (result as NuOrderPaginatedResponse<NuOrderCatalog>).data ?? [];

        const lines: string[] = [];
        if (catalogs.length > 0) {
          for (const cat of catalogs) {
            let line = `• ${cat.name}  id=${cat._id}`;
            if (cat.season) line += `  season=${cat.season}`;
            if (cat.year) line += `  year=${cat.year}`;
            if (cat.status) line += `  status=${cat.status}`;
            if (cat.entry_count !== undefined) line += `  entries=${cat.entry_count}`;
            lines.push(line);
          }
        } else {
          lines.push("No catalogs found.");
        }

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: formatError(err, "listing catalogs") }],
          isError: true,
        };
      }
    }
  );
}

function formatInventory(inv: NuOrderInventory): string {
  const lines: string[] = [
    `Inventory ID: ${inv._id}`,
  ];
  if (inv.product_id) lines.push(`Product ID: ${inv.product_id}`);
  if (inv.external_id) lines.push(`External ID: ${inv.external_id}`);
  if (inv.updated_at) lines.push(`Updated: ${inv.updated_at}`);

  if (inv.items && inv.items.length > 0) {
    lines.push("", `Stock levels (${inv.items.length} SKUs):`);
    for (const item of inv.items) {
      let line = `  • qty=${item.quantity}`;
      if (item.sku) line = `  • ${item.sku}  qty=${item.quantity}`;
      if (item.size) line += `  size=${item.size}`;
      if (item.warehouse) line += `  warehouse=${item.warehouse}`;
      lines.push(line);
    }
  } else {
    lines.push("", "No stock items found.");
  }

  return lines.join("\n");
}

function formatError(err: unknown, context: string): string {
  if (err instanceof NuOrderApiError) {
    return `NuOrder API error while ${context} (HTTP ${err.status}): ${err.message}`;
  }
  if (err instanceof Error) {
    return `Error while ${context}: ${err.message}`;
  }
  return `Unexpected error while ${context}.`;
}
