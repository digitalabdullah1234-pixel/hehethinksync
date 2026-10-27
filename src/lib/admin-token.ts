import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DATA_DIR } from "./data-dir";

/**
 * The admin's session token: an expiry time and its HMAC, signed with the
 * session secret and the account together, so changing either signs everyone
 * out. Plain Node crypto, so the admin pages and the proxy check it alike.
 */
export const ADMIN_COOKIE = "ts_admin";

/**
 * The account. ADMIN_USER and ADMIN_PASSWORD, when set, replace the built-in
 * one, whose password is kept here only as a scrypt hash (salt:hash, base64url).
 */
export const ADMIN_USER = process.env.ADMIN_USER?.trim() || "thinksync";
export const ADMIN_PASSWORD_HASH = "Frd_AO7j5qsWn9ZfHYa4jQ:uNXcq9dcuHLvdSIgp5T1jq8wc_lUhD6dDMu9CCY54uU";

/**
 * ADMIN_SECRET if set, else one made on first use and kept in the data folder
 * (.admin-secret), so it survives restarts and redeploys and is never in the code.
 */
let secret: string | undefined;

function sessionSecret() {
  if (secret) return secret;
  const env = process.env.ADMIN_SECRET;
  if (env && env.length >= 16) return (secret = env);
  const file = path.join(/*turbopackIgnore: true*/ DATA_DIR, ".admin-secret");
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    // "wx": only the first caller writes it; everyone after reads that one.
    fs.writeFileSync(file, randomBytes(32).toString("base64url"), { flag: "wx", mode: 0o600 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "EEXIST") return undefined;
  }
  try {
    return (secret = fs.readFileSync(file, "utf8").trim() || undefined);
  } catch {
    return undefined;
  }
}

export const adminConfigured = () => Boolean(sessionSecret());

function key() {
  const s = sessionSecret();
  if (!s) throw new Error("No admin session secret: make the data folder writable or set ADMIN_SECRET (16+ characters).");
  return `${s}:${ADMIN_USER}:${process.env.ADMIN_PASSWORD || ADMIN_PASSWORD_HASH}`;
}

const sign = (value: string) => createHmac("sha256", key()).update(value).digest("base64url");

/** A token that holds until `expires` (ms since the epoch). */
export function makeToken(expires: number) {
  const value = String(expires);
  return `${value}.${sign(value)}`;
}

/** True for a token this server signed that has not yet expired. */
export function validToken(raw: string | undefined) {
  if (!raw || !adminConfigured()) return false;
  const [value, signature] = raw.split(".");
  if (!value || !signature) return false;
  const given = Buffer.from(signature);
  const wanted = Buffer.from(sign(value));
  return given.length === wanted.length && timingSafeEqual(given, wanted) && Number(value) > Date.now();
}
