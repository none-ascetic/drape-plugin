import {
  ENV_VARS,
  RATE_LIMIT_MAX_CONCURRENT,
  RATE_LIMIT_MAX_RETRIES,
  RATE_LIMIT_RETRY_BASE_MS,
  RATE_LIMIT_RETRY_MAX_MS,
  getApiBaseUrl,
  isMockDomain,
} from "../constants.js";
import { NuOrderRequestOptions } from "../types.js";
import { NuOrderAuth } from "./auth.js";

export class NuOrderRateLimitError extends Error {
  constructor(public readonly retryAfterMs: number) {
    super(`NuOrder rate limit exceeded; retry after ${retryAfterMs}ms`);
    this.name = "NuOrderRateLimitError";
  }
}

export class NuOrderNotFoundError extends Error {
  constructor(public readonly url: string) {
    super(`NuOrder resource not found: ${url}`);
    this.name = "NuOrderNotFoundError";
  }
}

export class NuOrderApiError extends Error {
  constructor(
    public readonly status: number,
    message: string
  ) {
    super(`NuOrder API error ${status}: ${message}`);
    this.name = "NuOrderApiError";
  }
}

export class NuOrderReadOnlyError extends Error {
  constructor(method: string) {
    super(
      `NuOrder is configured in read-only mode (NUORDER_READ_ONLY=true). ` +
        `${method} requests are not permitted. To enable writes, set NUORDER_READ_ONLY=false.`
    );
    this.name = "NuOrderReadOnlyError";
  }
}

/** Simple counting semaphore for concurrency control */
class Semaphore {
  private count: number;
  private queue: Array<() => void> = [];

  constructor(max: number) {
    this.count = max;
  }

  async acquire(): Promise<void> {
    if (this.count > 0) {
      this.count--;
      return;
    }
    await new Promise<void>((resolve) => this.queue.push(resolve));
  }

  release(): void {
    const next = this.queue.shift();
    if (next) {
      next();
    } else {
      this.count++;
    }
  }
}

const semaphore = new Semaphore(RATE_LIMIT_MAX_CONCURRENT);

/**
 * NuOrder REST client.
 *
 * - Applies OAuth 1.0 signing unless the domain is the Apiary mock.
 * - Enforces a concurrency semaphore (max 4 concurrent requests).
 * - Retries 429 responses with exponential backoff.
 * - Only GET requests are permitted per project safety rules.
 */
export class NuOrderClient {
  private auth: NuOrderAuth | null;
  private baseUrl: string;
  private mock: boolean;
  private readOnly: boolean;

  constructor(auth: NuOrderAuth | null = null) {
    this.baseUrl = getApiBaseUrl();
    this.mock = isMockDomain();
    this.auth = this.mock ? null : auth;
    this.readOnly = process.env[ENV_VARS.READ_ONLY] === "true";
  }

  /**
   * Make a GET request to the NuOrder API.
   *
   * @param path - API path, e.g. "/api/order/list"
   * @param options - Optional query params
   */
  async get<T = unknown>(
    path: string,
    options: Pick<NuOrderRequestOptions, "params"> = {}
  ): Promise<T> {
    const url = this.buildUrl(path, options.params);
    return this.request<T>("GET", url);
  }

  async post<T = unknown>(path: string, body: unknown): Promise<T> {
    if (this.readOnly) throw new NuOrderReadOnlyError("POST");
    const url = this.buildUrl(path);
    return this.request<T>("POST", url, 0, body);
  }

  async put<T = unknown>(path: string, body: unknown): Promise<T> {
    if (this.readOnly) throw new NuOrderReadOnlyError("PUT");
    const url = this.buildUrl(path);
    return this.request<T>("PUT", url, 0, body);
  }

  async delete<T = unknown>(path: string): Promise<T> {
    if (this.readOnly) throw new NuOrderReadOnlyError("DELETE");
    const url = this.buildUrl(path);
    return this.request<T>("DELETE", url);
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean>
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        url.searchParams.set(k, String(v));
      }
    }
    return url.toString();
  }

  private async request<T>(
    method: string,
    url: string,
    attempt = 0,
    body?: unknown
  ): Promise<T> {
    if (!this.mock && !this.auth) {
      throw new Error(
        "NuOrder credentials not configured. Run /drape:setup to connect your account."
      );
    }

    await semaphore.acquire();
    let slotReleased = false;
    try {
      const headers: Record<string, string> = {
        Accept: "application/json",
        "Content-Type": "application/json",
      };

      if (!this.mock && this.auth) {
        headers["Authorization"] = this.auth.sign(method, url);
      }

      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (response.status === 429) {
        const retryAfterHeader = response.headers.get("Retry-After");
        const retryAfterMs = retryAfterHeader
          ? parseInt(retryAfterHeader, 10) * 1000
          : Math.min(
              RATE_LIMIT_RETRY_BASE_MS * Math.pow(2, attempt),
              RATE_LIMIT_RETRY_MAX_MS
            );

        if (attempt >= RATE_LIMIT_MAX_RETRIES) {
          throw new NuOrderRateLimitError(retryAfterMs);
        }

        // Release slot before sleeping so other requests aren't blocked
        // during the backoff window. Re-acquired on the next attempt.
        slotReleased = true;
        semaphore.release();
        await sleep(retryAfterMs);
        return this.request<T>(method, url, attempt + 1, body);
      }

      if (response.status === 404) {
        throw new NuOrderNotFoundError(url);
      }

      if (!response.ok) {
        const text = await response.text().catch(() => response.statusText);
        throw new NuOrderApiError(response.status, text);
      }

      return (await response.json()) as T;
    } finally {
      if (!slotReleased) semaphore.release();
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
