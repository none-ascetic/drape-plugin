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
 * NuOrder's server deviates significantly from RFC 5849. Standard OAuth
 * libraries will produce invalid signatures. Confirmed working against
 * live NuOrder API 2026-03-13. Reference: github.com/jacobsvante/nuorder
 *
 * Deviations from standard OAuth:
 *   Base string : METHOD + URL + "?" + params  (no & separators, no encoding)
 *   Param order : consumer_key, token, timestamp, nonce, version, sig_method
 *   Param values: NOT URL-encoded in the base string
 *   Signing key : raw consumer_secret&token_secret  (NOT percent-encoded)
 *   Digest      : hex  (NOT base64)
 *   Auth header : OAuth k=v,k=v  (no quotes around values, no spaces)
 */
export class NuOrderAuth {
  private credentials: NuOrderCredentials;

  constructor(credentials: NuOrderCredentials) {
    this.credentials = credentials;
  }

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

  sign(method: string, url: string): string {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(8).toString("hex"); // 16 hex chars

    // NuOrder only includes oauth params in the base string — NOT URL query params.
    // Reference: github.com/jacobsvante/nuorder _get_base_string()
    const oauthParams: [string, string][] = [
      ["oauth_consumer_key", this.credentials.consumerKey],
      ["oauth_token", this.credentials.accessToken],
      ["oauth_timestamp", timestamp],
      ["oauth_nonce", nonce],
      ["oauth_version", "1.0"],
      ["oauth_signature_method", "HMAC-SHA1"],
    ];

    const paramString = oauthParams.map(([k, v]) => `${k}=${v}`).join("&");

    // Strip query string — base string uses clean URL path only
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // NuOrder base string: METHOD concatenated directly with URL then "?" + params
    // No & separators between method/URL/params; URL and param values are NOT encoded
    const signatureBase = `${method.toUpperCase()}${baseUrl}?${paramString}`;

    // Signing key: raw secret&secret — NOT percent-encoded
    const signingKey = `${this.credentials.consumerSecret}&${this.credentials.accessTokenSecret}`;

    // Digest: hex — NOT base64
    const signature = crypto
      .createHmac("sha1", signingKey)
      .update(signatureBase)
      .digest("hex");

    // Auth header: OAuth k=v,k=v — no quotes, no spaces after commas
    return (
      "OAuth " +
      [...oauthParams, ["oauth_signature", signature]]
        .map(([k, v]) => `${k}=${v}`)
        .join(",")
    );
  }
}
