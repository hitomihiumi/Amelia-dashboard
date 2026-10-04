/**
 * TLS settings for databases that are reached over the internet (the dashboard on Vercel talking to
 * PostgreSQL and Redis on another host).
 *
 * A certificate from a public CA (Let's Encrypt) needs nothing here: `sslmode=verify-full` in
 * DATABASE_URL and `rediss://` in REDIS_URL are enough. A certificate that public clients do not trust,
 * such as a Cloudflare Origin CA certificate, needs its CA certificate (not the server certificate):
 * put the PEM into DATABASE_SSL_CA and REDIS_TLS_CA. The connection stays fully verified, only the
 * trusted CA is added.
 */

/**
 * Reads a PEM from an environment variable. Accepts the PEM as is, with `\n` written as two characters
 * (how some dashboards store multi-line values), or base64 encoded.
 */
export function pemFromEnv(name: string): string | undefined {
  const raw = process.env[name]?.trim();
  if (!raw) return undefined;

  if (raw.includes("-----BEGIN")) return raw.replace(/\\n/g, "\n");

  try {
    const decoded = Buffer.from(raw, "base64").toString("utf8");
    if (decoded.includes("-----BEGIN")) return decoded;
  } catch {
    // fall through
  }
  throw new Error(`${name} must be a PEM certificate (or the base64 of one).`);
}

/**
 * Connection settings for `PrismaPg`. With DATABASE_SSL_CA the CA is passed explicitly and `sslmode` /
 * `sslrootcert` are removed from the URL: node-postgres lets the URL override `ssl`, which would drop the CA.
 */
export function postgresConnection(url: string): {
  connectionString: string;
  ssl?: { ca: string; rejectUnauthorized: true };
} {
  const ca = pemFromEnv("DATABASE_SSL_CA");
  if (!ca || !url) return { connectionString: url };

  const parsed = new URL(url);
  parsed.searchParams.delete("sslmode");
  parsed.searchParams.delete("sslrootcert");
  return { connectionString: parsed.toString(), ssl: { ca, rejectUnauthorized: true } };
}

/** ioredis options that trust an extra CA (see REDIS_TLS_CA). */
export function redisTlsOptions(): { tls: { ca: string } } | Record<string, never> {
  const ca = pemFromEnv("REDIS_TLS_CA");
  return ca ? { tls: { ca } } : {};
}
