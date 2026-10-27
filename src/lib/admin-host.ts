/**
 * The admin's own domain: ADMIN_HOST if set, else any domain that starts with
 * "admin." (admin.testea.site, admin.thinksync.sa; admin.localhost:3000 when
 * working locally). Every other domain is the site.
 */
const ADMIN_HOST = process.env.ADMIN_HOST?.trim().toLowerCase();

/** The domain the visitor typed (with its port, if any), as the server in front of the app passed it on. */
export const requestHost = (headers: Headers) =>
  (headers.get("x-forwarded-host") ?? headers.get("host") ?? "").split(",")[0].trim().toLowerCase();

export function isAdminHost(host: string) {
  const name = host.split(":")[0];
  return ADMIN_HOST ? name === ADMIN_HOST : name.startsWith("admin.");
}

/** The site's domain next to the admin's: admin.testea.site → testea.site. */
export const siteHost = (adminHost: string) => adminHost.replace(/^admin\./, "");
