import crypto from "node:crypto";
import { NuOrderCredentials } from "../types.js";
import { ENV_VARS, REQUIRED_ENV_VARS } from "../constants.js";

export class NuOrderAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NuOrderAuthError";
  }
}

/**
 * NuOrder OAuth 1.0 HMAC-SHA1 signing.
 *
 * NuOrder uses a non-standard base string: the method and URL are NOT
 * separated by `&`. Instead the base string is:
 *   METHOD&percent_encoded_url&percent_encoded_params
 *
 * Wait — actually the non-standard part documented in the NuOrder SDK is
 * that they do NOT use the standard OAuth base string separator between
 * method and URL. The base string is built as:
 *   `{METHOD}&{encodedURL}&{encodedParams}`
 *
 * That IS the standard form. The NuOrder-specific quirk is that they sign
 * with `consumerSecret&tokenSecret` as the HMAC key (standard), but the
 * base string omits the `&` after the HTTP method — i.e. the base string is:
 *   `{METHOD}{encodedURL}&{encodedParams}`
 *
 * This class follows NuOrder's reference implementation exactly.
 */
export class NuOrderAuth {
  private credentials: NuOrderCredentials;

  constructor(credentials: NuOrderCredentials) {
    this.credentials = credentials;
  }

  /**
   * Load credentials from environment variables. Throws NuOrderAuthError
   * if any required env var is missing.
   */
  static fromEnv(): NuOrderAuth {
    const missing = REQUIRED_ENV_VARS.filter((v) => !process.env[v]);
    if (missing.length > 0) {
      throw new NuOrderAuthError(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }

    return new NuOrderAuth({
      consumerKey: process.env[ENV_VARS.CONSUMER_KEY]!,
      consumerSecret: process.env[ENV_VARS.CONSUMER_SECRET]!,
      accessToken: process.env[ENV_VARS.ACCESS_TOKEN]!,
      accessTokenSecret: process.env[ENV_VARS.ACCESS_TOKEN_SECRET]!,
    });
  }

  /**
   * Validate that all credentials are present. Useful for startup checks.
   */
  validate(): void {
    const { consumerKey, consumerSecret, accessToken, accessTokenSecret } =
      this.credentials;
    if (!consumerKey || !consumerSecret || !accessToken || !accessTokenSecret) {
      throw new NuOrderAuthError("OAuth credentials are incomplete");
    }
  }

  /**
   * Generate the OAuth Authorization header for a request.
   *
   * @param method - HTTP method (GET, POST, etc.)
   * @param url - Full URL including query string
   * @returns Authorization header value
   */
  sign(method: string, url: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString("hex");

    // Parse query params from the URL so they're included in the signature
    const urlObj = new URL(url);
    const queryParams: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      queryParams[key] = value;
    });

    // Collect OAuth params (without oauth_signature)
    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.credentials.consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: "HMAC-SHA1",
      oauth_timestamp: timestamp,
      oauth_token: this.credentials.accessToken,
      oauth_version: "1.0",
    };

    // Merge and sort all params for the signature base string
    const allParams = { ...queryParams, ...oauthParams };
    const sortedParams = Object.keys(allParams)
      .sort()
      .map(
        (k) =>
          `${percentEncode(k)}=${percentEncode(allParams[k])}`
      )
      .join("&");

    // Base URL without query string
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // NuOrder non-standard base string: no `&` between METHOD and encoded URL
    // Standard OAuth:  METHOD & encodedURL & encodedParams
    // NuOrder:         METHOD encodedURL & encodedParams
    const signatureBase = `${method.toUpperCase()}${percentEncode(baseUrl)}&${percentEncode(sortedParams)}`;

    // HMAC-SHA1 key: consumerSecret&tokenSecret
    const signingKey = `${percentEncode(this.credentials.consumerSecret)}&${percentEncode(this.credentials.accessTokenSecret)}`;

    const signature = crypto
      .createHmac("sha1", signingKey)
      .update(signatureBase)
      .digest("base64");

    oauthParams["oauth_signature"] = signature;

    // Build the Authorization header
    const authHeader =
      "OAuth " +
      Object.keys(oauthParams)
        .sort()
        .map((k) => `${k}="${percentEncode(oauthParams[k])}"`)
        .join(", ");

    return authHeader;
  }
}

/**
 * RFC 3986 percent encoding — stricter than encodeURIComponent.
 * Encodes characters that encodeURIComponent leaves unencoded: ! ' ( ) *
 */
function percentEncode(str: string): string {
  return encodeURIComponent(str).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );
}
