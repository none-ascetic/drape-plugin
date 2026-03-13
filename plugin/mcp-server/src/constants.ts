// NuOrder API constants

// API base URLs
export const NUORDER_PRODUCTION_DOMAIN = "wholesale.nuorder.com";
// Mock/proxy domains are optional — configure via NUORDER_MOCK_DOMAIN / NUORDER_PROXY_DOMAIN in .env
export const NUORDER_MOCK_DOMAIN =
  process.env["NUORDER_MOCK_DOMAIN"] ?? "";
export const NUORDER_PROXY_DOMAIN =
  process.env["NUORDER_PROXY_DOMAIN"] ?? "";

export function getApiBaseUrl(domain?: string): string {
  const d = domain ?? process.env["NUORDER_DOMAIN"] ?? NUORDER_PRODUCTION_DOMAIN;
  return `https://${d}`;
}

export function isMockDomain(domain?: string): boolean {
  const d = domain ?? process.env["NUORDER_DOMAIN"] ?? NUORDER_PRODUCTION_DOMAIN;
  return d === NUORDER_MOCK_DOMAIN;
}

// Rate limiting
export const RATE_LIMIT_MAX_CONCURRENT = 4; // NuOrder supports 5 max; keep 1 buffer
export const RATE_LIMIT_RETRY_BASE_MS = 1_000; // Base delay for exponential backoff
export const RATE_LIMIT_RETRY_MAX_MS = 32_000; // Max backoff cap
export const RATE_LIMIT_MAX_RETRIES = 5;

// Pagination
export const PAGINATION_DEFAULT_LIMIT = 50;
export const PAGINATION_MAX_LIMIT = 500; // NuOrder hard limit per page
export const PAGINATION_CURSOR_PARAM = "__last_id";
export const PAGINATION_LIMIT_PARAM = "__limit";

// Order statuses
export const ORDER_STATUSES = [
  "pending",
  "approved",
  "processing",
  "shipped",
  "cancelled",
  "draft",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

// API path prefixes
export const API_V1 = "/api";
export const API_V3 = "/api/v3.0";
export const API_V3_1 = "/api/v3.1";

// Character limits (for MCP tool descriptions / user-facing strings)
export const MAX_NOTES_LENGTH = 5_000;
export const MAX_DESCRIPTION_LENGTH = 10_000;

// Environment variable names
export const ENV_VARS = {
  DOMAIN: "NUORDER_DOMAIN",
  CONSUMER_KEY: "NUORDER_CONSUMER_KEY",
  CONSUMER_SECRET: "NUORDER_CONSUMER_SECRET",
  ACCESS_TOKEN: "NUORDER_TOKEN",
  ACCESS_TOKEN_SECRET: "NUORDER_TOKEN_SECRET",
  READ_ONLY: "NUORDER_READ_ONLY",
} as const;

// Required env vars for production (non-mock) use
export const REQUIRED_ENV_VARS = [
  ENV_VARS.CONSUMER_KEY,
  ENV_VARS.CONSUMER_SECRET,
  ENV_VARS.ACCESS_TOKEN,
  ENV_VARS.ACCESS_TOKEN_SECRET,
] as const;
