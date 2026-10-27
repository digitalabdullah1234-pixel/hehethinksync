import { createHash, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, ADMIN_PASSWORD_HASH, ADMIN_USER, adminConfigured, makeToken, validToken } from "./admin-token";
import { clientIp } from "./rate-limit";

export { adminConfigured };

/**
 * The admin's sign-in: one account (see admin-token.ts) and a signed cookie.
 */
const WEEK = 7 * 24 * 60 * 60;

const digest = (value: string) => createHash("sha256").update(value).digest();
const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, length: number) => Promise<Buffer>;

async function rightAccount(user: string, password: string) {
  const userOk = timingSafeEqual(digest(user.trim()), digest(ADMIN_USER));
  const plain = process.env.ADMIN_PASSWORD;
  if (plain) return timingSafeEqual(digest(password), digest(plain)) && userOk;
  const [salt, hash] = ADMIN_PASSWORD_HASH.split(":").map((part) => Buffer.from(part, "base64url"));
  return timingSafeEqual(await scryptAsync(password, salt, hash.length), hash) && userOk;
}

/**
 * Failed sign-ins: ten wrong passwords lock that address out for fifteen
 * minutes, and a hundred from all addresses together lock sign-in for
 * everyone for fifteen minutes, so changing addresses doesn't help a guesser.
 */
const failures = new Map<string, { count: number; until: number }>();
const LIMIT = 10;
const ALL_LIMIT = 100;
const LOCK_MS = 15 * 60 * 1000;

/** Checks the username and password and, if right, signs in. Returns an error message, or null on success. */
export async function signIn(user: string, password: string): Promise<string | null> {
  if (!adminConfigured()) return "The server can't keep the admin's session secret.";
  const who = clientIp(await headers());
  const now = Date.now();
  const f = failures.get(who);
  const all = failures.get("*");
  if ((f && f.count >= LIMIT && f.until > now) || (all && all.count >= ALL_LIMIT && all.until > now)) return "Too many wrong passwords. Try again in 15 minutes.";
  if (!(await rightAccount(user, password))) {
    for (const [k, prev] of [[who, f], ["*", all]] as const) {
      failures.set(k, { count: prev && prev.until > now ? prev.count + 1 : 1, until: now + LOCK_MS });
    }
    return "Wrong username or password.";
  }
  failures.delete(who);
  (await cookies()).set(ADMIN_COOKIE, makeToken(now + WEEK * 1000), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK,
  });
  return null;
}

export async function signOut() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin() {
  return validToken((await cookies()).get(ADMIN_COOKIE)?.value);
}

/** For every admin page and action: sends anyone not signed in to the sign-in page. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect("/login");
}
