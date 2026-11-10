// Reads the two public Supabase settings from .env.local (or Vercel's settings), and says
// plainly which one is missing instead of failing with an unclear error later.
// Next.js only copies NEXT_PUBLIC_ values into the browser when they are written out in full,
// so each one is named exactly here.

export function supabaseSettings(): { url: string; publishableKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is missing. Add it to .env.local (see .env.example).");
  if (!publishableKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is missing. Add it to .env.local (see .env.example).");
  }
  return { url, publishableKey };
}
