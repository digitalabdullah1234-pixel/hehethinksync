import Link from "next/link";
import { headers } from "next/headers";
import { requestHost, siteHost } from "@/lib/admin-host";
import { logout } from "./actions";

/** The admin's top bar: the name, a link to the site, and sign out. */
export async function Bar() {
  // On the admin's domain "/" is the panel, so the site is the domain next to it.
  const site = `//${siteHost(requestHost(await headers()))}/`;
  return (
    <header className="a-bar">
      <Link href="/" className="a-brand">
        ThinkSync <span>admin</span>
      </Link>
      <nav>
        <a href={site} target="_blank" rel="noreferrer">
          View site ↗
        </a>
        <form action={logout}>
          <button type="submit" className="a-link">
            Sign out
          </button>
        </form>
      </nav>
    </header>
  );
}
