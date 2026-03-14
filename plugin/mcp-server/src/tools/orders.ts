import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NuOrderClient, NuOrderNotFoundError, NuOrderApiError } from "../services/client.js";
import { NuOrderOrder, NuOrderPaginatedResponse } from "../types.js";
import {
  API_V1,
  ORDER_STATUSES,
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from "../constants.js";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
} as const;

export function registerOrderTools(server: McpServer, client: NuOrderClient): void {
  // drape_list_orders
  server.tool(
    "drape_list_orders",
    "List wholesale orders. Filter by status (pending, approved, processing, shipped, cancelled, draft). Returns paginated results with a cursor for the next page.",
    {
      status: z
        .enum(ORDER_STATUSES)
        .optional()
        .describe("Filter by order status. Omit to list all orders."),
      limit: z
        .number()
        .int()
        .min(1)
        .max(PAGINATION_MAX_LIMIT)
        .optional()
        .default(PAGINATION_DEFAULT_LIMIT)
        .describe(`Number of orders per page (1–${PAGINATION_MAX_LIMIT}, default ${PAGINATION_DEFAULT_LIMIT}).`),
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response (__last_id) to fetch the next page."),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ status, limit, cursor }) => {
      try {
        // NuOrder API: status goes in URL path, not query param.
        // /api/orders/{status}/detail returns full order objects.
        // IMPORTANT: No query params — NuOrder's OAuth rejects requests with query params.
        const path = status
          ? `${API_V1}/orders/${encodeURIComponent(status)}/detail`
          : `${API_V1}/orders/pending/detail`; // default to pending when no status given

        const result = await client.get<NuOrderPaginatedResponse<NuOrderOrder>>(path);

        // Normalise the three response shapes the API/mock can return:
        //   1. { data: [...], total: N }  — paginated production response
        //   2. [...]                       — bare array
        //   3. { order_number: ... }       — single order object (Apiary mock fixture)
        const raw = result as unknown;
        let orders: NuOrderOrder[];
        if (Array.isArray(raw)) {
          orders = raw;
        } else if (Array.isArray((raw as NuOrderPaginatedResponse<NuOrderOrder>).data)) {
          orders = (raw as NuOrderPaginatedResponse<NuOrderOrder>).data!;
        } else if ((raw as NuOrderOrder).order_number ?? (raw as NuOrderOrder)._id) {
          orders = [raw as NuOrderOrder];
        } else {
          orders = [];
        }
        const lastId = (result as NuOrderPaginatedResponse<NuOrderOrder>).__last_id;
        const total = (result as NuOrderPaginatedResponse<NuOrderOrder>).total;

        const lines: string[] = [];
        if (Array.isArray(orders) && orders.length > 0) {
          for (const order of orders) {
            lines.push(
              `• ${order.order_number ?? order._id}  status=${order.status}  ` +
              `company=${order.company_name ?? order.company_id ?? "—"}  ` +
              `total=${order.currency ?? ""}${order.total ?? "—"}  ` +
              `ship=${order.ship_date ?? "—"}`
            );
          }
        } else {
          lines.push("No orders found matching the specified criteria.");
        }

        const meta: string[] = [];
        if (total !== undefined) meta.push(`Total: ${total}`);
        if (lastId) meta.push(`Next page cursor: ${lastId}`);
        if (meta.length) lines.push("", meta.join("  ·  "));

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: formatError(err, "listing orders") }],
          isError: true,
        };
      }
    }
  );

  // drape_get_order
  server.tool(
    "drape_get_order",
    "Get full details for an order by its internal ID (_id field). For order number lookups use drape_get_order_by_number instead.",
    {
      order_id: z
        .string()
        .min(1)
        .describe("The internal order ID (_id). Example: '507f1f77bcf86cd799439011'."),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ order_id }) => {
      try {
        const order = await client.get<NuOrderOrder>(`${API_V1}/order/${encodeURIComponent(order_id)}`);
        return { content: [{ type: "text" as const, text: formatOrder(order) }] };
      } catch (err) {
        if (err instanceof NuOrderNotFoundError) {
          return {
            content: [{
              type: "text" as const,
              text: `Order not found — check the order ID format. Received: "${order_id}". Use drape_list_orders to browse orders.`,
            }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: formatError(err, `fetching order ${order_id}`) }],
          isError: true,
        };
      }
    }
  );

  // drape_get_order_by_number
  server.tool(
    "drape_get_order_by_number",
    "Get full details for an order by its human-readable order number (e.g. 'ORD-12345'). For internal ID lookups use drape_get_order instead.",
    {
      order_number: z
        .string()
        .min(1)
        .describe("The human-readable order number. Example: 'ORD-12345'."),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ order_number }) => {
      try {
        const order = await client.get<NuOrderOrder>(
          `${API_V1}/order/number/${encodeURIComponent(order_number)}`
        );
        return { content: [{ type: "text" as const, text: formatOrder(order) }] };
      } catch (err) {
        if (err instanceof NuOrderNotFoundError) {
          return {
            content: [{
              type: "text" as const,
              text: `Order not found — check the order number format. Received: "${order_number}". Use drape_list_orders to browse orders.`,
            }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: formatError(err, `fetching order number ${order_number}`) }],
          isError: true,
        };
      }
    }
  );
}

function formatOrder(order: NuOrderOrder): string {
  const lines: string[] = [
    `Order: ${order.order_number ?? order._id}`,
    `Status: ${order.status}`,
  ];
  if (order.company_name) lines.push(`Company: ${order.company_name}`);
  if (order.buyer_email) lines.push(`Buyer: ${order.buyer_email}`);
  if (order.total !== undefined) lines.push(`Total: ${order.currency ?? ""}${order.total}`);
  if (order.ship_date) lines.push(`Ship date: ${order.ship_date}`);
  if (order.cancel_date) lines.push(`Cancel date: ${order.cancel_date}`);
  if (order.notes) lines.push(`Notes: ${order.notes}`);
  if (order.created_at) lines.push(`Created: ${order.created_at}`);
  if (order.updated_at) lines.push(`Updated: ${order.updated_at}`);

  if (order.items && order.items.length > 0) {
    lines.push("", `Items (${order.items.length}):`);
    for (const item of order.items) {
      lines.push(
        `  • ${item.name ?? item.sku ?? item.product_id}  qty=${item.quantity}  ` +
        `unit=${order.currency ?? ""}${item.unit_price}`
      );
    }
  }

  return lines.join("\n");
}

function formatError(err: unknown, context: string): string {
  if (err instanceof NuOrderApiError) {
    return `API error while ${context} (HTTP ${err.status}): ${err.message}`;
  }
  if (err instanceof Error) {
    return `Error while ${context}: ${err.message}`;
  }
  return `Unexpected error while ${context}.`;
}
