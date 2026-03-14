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

    // Alphanumeric nonce matching NuOrder's generateNonce() in the API blueprint
    const keylist = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let nonce = "";
    for (let i = 0; i < 16; i++) {
      nonce += keylist[Math.floor(Math.random() * keylist.length)];
    }

    // Strip query string — base string uses clean URL path only
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

    // NuOrder base string: METHOD + encodeURI(url) + "?" + params
    // Param order: consumer_key, token, timestamp, nonce, version, sig_method
    // Values are NOT encoded. Reference: API blueprint createSignature() lines 83-102.
    const paramString =
      `oauth_consumer_key=${this.credentials.consumerKey}&` +
      `oauth_token=${this.credentials.accessToken}&` +
      `oauth_timestamp=${timestamp}&` +
      `oauth_nonce=${nonce}&` +
      `oauth_version=1.0&` +
      `oauth_signature_method=HMAC-SHA1`;

    const signatureBase = `${method.toUpperCase()}${encodeURI(baseUrl)}?${paramString}`;

    // Signing key: raw secret&secret — NOT percent-encoded
    const signingKey = `${this.credentials.consumerSecret}&${this.credentials.accessTokenSecret}`;

    // Digest: hex — NOT base64
    const signature = crypto
      .createHmac("sha1", signingKey)
      .update(signatureBase)
      .digest("hex");

    // Auth header: double quotes around values — Reference: API blueprint getAuthorizationHeader()
    return (
      `OAuth oauth_consumer_key="${this.credentials.consumerKey}",` +
      `oauth_timestamp="${timestamp}",` +
      `oauth_nonce="${nonce}",` +
      `oauth_version="1.0",` +
      `oauth_signature_method="HMAC-SHA1",` +
      `oauth_token="${this.credentials.accessToken}",` +
      `oauth_signature="${signature}"`
    );
  }
}
