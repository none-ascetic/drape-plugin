import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { NuOrderClient, NuOrderNotFoundError, NuOrderApiError } from "../services/client.js";
import { NuOrderCompany, NuOrderPaginatedResponse } from "../types.js";
import {
  API_V1,
  PAGINATION_DEFAULT_LIMIT,
  PAGINATION_MAX_LIMIT,
} from "../constants.js";

const READ_ONLY_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
} as const;

export function registerCompanyTools(server: McpServer, client: NuOrderClient): void {
  // drape_list_companies
  server.tool(
    "drape_list_companies",
    "List buyer/retailer companies with pagination. Returns company names, codes, and statuses.",
    {
      limit: z
        .number()
        .int()
        .min(1)
        .max(PAGINATION_MAX_LIMIT)
        .optional()
        .default(PAGINATION_DEFAULT_LIMIT)
        .describe(`Number of companies per page (1–${PAGINATION_MAX_LIMIT}, default ${PAGINATION_DEFAULT_LIMIT}).`),
      cursor: z
        .string()
        .optional()
        .describe("Pagination cursor from a previous response (__last_id) to fetch the next page."),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ limit, cursor }) => {
      try {
        // /api/companies/{field}/{when}/{mm}/{dd}/{yyyy} returns full objects.
        // No query params — NuOrder's OAuth rejects requests with query params.
        // Use a broad date to get all companies, then paginate in memory.
        const allCompanies = await client.get<NuOrderCompany[]>(
          `${API_V1}/companies/modified/after/1/1/2000`
        );

        const companies: NuOrderCompany[] = Array.isArray(allCompanies) ? allCompanies : [];
        const total = companies.length;

        // Apply cursor (skip items before cursor) and limit in memory
        const effectiveLimit = limit ?? PAGINATION_DEFAULT_LIMIT;
        const startIdx = cursor
          ? companies.findIndex((c) => c._id === cursor) + 1
          : 0;
        const page = companies.slice(startIdx, startIdx + effectiveLimit);
        const lastId = page.length > 0 ? page[page.length - 1]?._id : undefined;

        const lines: string[] = [];
        if (page.length > 0) {
          for (const co of page) {
            lines.push(
              `• ${co.name}  id=${co._id}` +
              (co.code ? `  code=${co.code}` : "") +
              (co.status ? `  status=${co.status}` : "")
            );
          }
        } else {
          lines.push("No companies found.");
        }

        const meta: string[] = [];
        if (total !== undefined) meta.push(`Total: ${total}`);
        if (lastId) meta.push(`Next page cursor: ${lastId}`);
        if (meta.length) lines.push("", meta.join("  ·  "));

        return { content: [{ type: "text" as const, text: lines.join("\n") }] };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: formatError(err, "listing companies") }],
          isError: true,
        };
      }
    }
  );

  // drape_get_company
  server.tool(
    "drape_get_company",
    "Get full company profile by internal ID, including contacts, addresses, and status. Use drape_get_company_by_code for retailer code lookups.",
    {
      company_id: z
        .string()
        .min(1)
        .describe("The internal company ID (_id). Example: '507f1f77bcf86cd799439011'."),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ company_id }) => {
      try {
        const company = await client.get<NuOrderCompany>(
          `${API_V1}/company/${encodeURIComponent(company_id)}`
        );
        return { content: [{ type: "text" as const, text: formatCompany(company) }] };
      } catch (err) {
        if (err instanceof NuOrderNotFoundError) {
          return {
            content: [{
              type: "text" as const,
              text: `Company not found — check the company ID. Received: "${company_id}". Use drape_list_companies to browse companies.`,
            }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: formatError(err, `fetching company ${company_id}`) }],
          isError: true,
        };
      }
    }
  );

  // drape_get_company_by_code
  server.tool(
    "drape_get_company_by_code",
    "Get full company profile by retailer code (e.g. 'SSENSE', 'NET-A-PORTER'). For internal ID lookups use drape_get_company instead.",
    {
      code: z
        .string()
        .min(1)
        .describe("The retailer/buyer company code. Example: 'SSENSE'."),
    },
    READ_ONLY_ANNOTATIONS,
    async ({ code }) => {
      try {
        const company = await client.get<NuOrderCompany>(
          `${API_V1}/company/code/${encodeURIComponent(code)}`
        );
        return { content: [{ type: "text" as const, text: formatCompany(company) }] };
      } catch (err) {
        if (err instanceof NuOrderNotFoundError) {
          return {
            content: [{
              type: "text" as const,
              text: `Company not found for code "${code}". Use drape_list_companies to browse companies.`,
            }],
            isError: true,
          };
        }
        return {
          content: [{ type: "text" as const, text: formatError(err, `fetching company by code ${code}`) }],
          isError: true,
        };
      }
    }
  );
}

function formatCompany(co: NuOrderCompany): string {
  const lines: string[] = [
    `Company: ${co.name}`,
    `ID: ${co._id}`,
  ];
  if (co.code) lines.push(`Code: ${co.code}`);
  if (co.status) lines.push(`Status: ${co.status}`);
  if (co.type) lines.push(`Type: ${co.type}`);
  if (co.rep_email) lines.push(`Sales rep: ${co.rep_email}`);

  if (co.billing_address) {
    const a = co.billing_address;
    const parts = [a.address1, a.address2, a.city, a.state, a.zip, a.country].filter(Boolean);
    if (parts.length) lines.push(`Billing: ${parts.join(", ")}`);
  }
  if (co.shipping_address) {
    const a = co.shipping_address;
    const parts = [a.address1, a.address2, a.city, a.state, a.zip, a.country].filter(Boolean);
    if (parts.length) lines.push(`Shipping: ${parts.join(", ")}`);
  }

  if (co.buyers && co.buyers.length > 0) {
    lines.push("", `Buyers (${co.buyers.length}):`);
    for (const b of co.buyers) {
      const name = [b.firstname, b.lastname].filter(Boolean).join(" ");
      lines.push(`  • ${b.email}${name ? `  (${name})` : ""}${b.title ? `  ${b.title}` : ""}`);
    }
  }

  if (co.created_at) lines.push("", `Created: ${co.created_at}`);
  if (co.updated_at) lines.push(`Updated: ${co.updated_at}`);

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
