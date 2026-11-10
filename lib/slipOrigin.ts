// Which web address the desk slip's QR code and written link point to. Patients always get the
// live link, whatever address the staff screen happens to be open on (a Vercel preview, the long
// team address). Only a staff screen running on this computer (localhost) keeps its own address,
// so testing still works.

export const PUBLIC_SITE = "https://virtual-er-izpf.vercel.app";

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

/** `currentOrigin` is the staff screen's own address, for example "http://localhost:3000". */
export function slipOrigin(currentOrigin: string): string {
  try {
    const { hostname, origin } = new URL(currentOrigin);
    return LOCAL_HOSTS.has(hostname) ? origin : PUBLIC_SITE;
  } catch {
    return PUBLIC_SITE;
  }
}
