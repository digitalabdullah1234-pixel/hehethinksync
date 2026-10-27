import path from "node:path";

/**
 * The server's own data folder: the admin's content, uploads and session
 * secret. DATA_DIR (default ./data) must be on a disk that survives restarts
 * and redeploys. Its own module, so the proxy can find it without the content.
 */
export const DATA_DIR = process.env.DATA_DIR ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "data");
