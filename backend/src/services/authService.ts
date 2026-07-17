import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

/**
 * Authentication service.
 *
 * Authentication is OPTIONAL and is entirely driven by environment variables:
 *
 *   AUTH_USERNAME      — the username a user must provide to log in
 *   AUTH_PASSWORD_HASH — a bcrypt hash of the password
 *
 * If EITHER of those two values is empty/missing, authentication is disabled
 * and the dashboard is publicly accessible (the original behaviour).
 *
 * When both are configured, every API endpoint (except the auth endpoints
 * themselves) requires a valid session token.
 *
 * The session token is an HMAC-signed payload (no extra dependencies). The
 * signing secret is derived from the configured password hash, which is itself
 * a secret and never exposed to clients.
 */

const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getAuthUsername(): string {
  return (process.env.AUTH_USERNAME || '').trim();
}

function getAuthPasswordHash(): string {
  return (process.env.AUTH_PASSWORD_HASH || '').trim();
}

/**
 * Whether login protection is active. Both username and password hash must be
 * configured for the login page to be enabled.
 */
export function isAuthEnabled(): boolean {
  return getAuthUsername().length > 0 && getAuthPasswordHash().length > 0;
}

/**
 * A stable, secret string used to sign tokens. Derived from the configured
 * password hash so that changing the password invalidates all existing tokens.
 */
function getSigningSecret(): string {
  return crypto
    .createHash('sha256')
    .update(`selfhost-dashboard::${getAuthPasswordHash()}::${getAuthUsername()}`)
    .digest('hex');
}

function base64UrlEncode(buf: Buffer | string): string {
  return Buffer.from(buf).toString('base64url');
}

function base64UrlDecode(str: string): string {
  return Buffer.from(str, 'base64url').toString('utf8');
}

interface TokenPayload {
  sub: string; // username
  exp: number; // expiry (seconds since epoch)
}

/**
 * Sign a new session token for the given username.
 */
export function signToken(username: string): string {
  const payload: TokenPayload = {
    sub: username,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');
  return `${encodedPayload}.${signature}`;
}

/**
 * Verify a token's signature and expiry. Returns true if valid.
 */
export function verifyToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [encodedPayload, signature] = parts;
  const expectedSignature = crypto
    .createHmac('sha256', getSigningSecret())
    .update(encodedPayload)
    .digest('base64url');

  // Constant-time comparison to avoid timing attacks.
  const a = Buffer.from(signature);
  const b = Buffer.from(expectedSignature);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as TokenPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Attempt to log a user in. Returns a token on success, or null on failure.
 */
export function login(username: string, password: string): string | null {
  if (!isAuthEnabled()) return null;

  const configuredUser = getAuthUsername();
  const configuredHash = getAuthPasswordHash();

  // Constant-time-ish username comparison.
  if (
    configuredUser.length !== username.length ||
    !crypto.timingSafeEqual(Buffer.from(configuredUser), Buffer.from(username))
  ) {
    return null;
  }

  try {
    if (!bcrypt.compareSync(password, configuredHash)) {
      return null;
    }
  } catch {
    // The configured hash was malformed; treat as login failure rather than
    // crashing the server.
    return null;
  }

  return signToken(username);
}

/**
 * Extract the token from a request. Supports both the `Authorization: Bearer`
 * header (used by regular fetch calls) and a `?token=` query parameter (used by
 * the SSE EventSource, which cannot set custom headers).
 */
export function extractToken(req: Request): string | undefined {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7).trim();
  }
  const queryToken = req.query.token;
  if (typeof queryToken === 'string' && queryToken.length > 0) {
    return queryToken;
  }
  return undefined;
}

/**
 * Express middleware that protects a route when authentication is enabled.
 * When auth is disabled, requests pass through untouched.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!isAuthEnabled()) {
    next();
    return;
  }

  if (verifyToken(extractToken(req))) {
    next();
    return;
  }

  res.status(401).json({ error: 'Unauthorized', requiresAuth: true });
}
