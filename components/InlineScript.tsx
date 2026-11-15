// A script in the page's <head> that runs while the browser reads the HTML, before the first paint.
// The server sends it as JavaScript; in the browser React sees "text/plain", so it does not warn
// that the script will not run again (it already ran). Pattern from the Next.js guide
// "Preventing flash before hydration". suppressHydrationWarning covers the different type.

export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
