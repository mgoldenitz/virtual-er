// Runs before Claude edits or writes a file: blocks the change if the new text looks like
// a secret key (Supabase secret key, Anthropic key, a JWT, an AWS or GitHub key, a private key).
// Keys belong in .env.local or a settings page, never in code (CLAUDE.md and SPEC.md).

const PATTERNS = [
  ["Supabase secret key", /sb_secret_[A-Za-z0-9_-]{8,}/],
  ["Anthropic API key", /sk-ant-[A-Za-z0-9_-]{8,}/],
  ["JWT (for example a Supabase service_role or anon key)", /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/],
  ["AWS access key", /AKIA[0-9A-Z]{16}/],
  ["GitHub token", /(gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{20,})/],
  ["private key", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
];

let input = "";
process.stdin.on("data", (chunk) => (input += chunk));
process.stdin.on("end", () => {
  let event;
  try {
    event = JSON.parse(input.replace(/^\uFEFF/, "")); // PowerShell can add an invisible mark at the start
  } catch {
    process.exit(0); // Not the input we expect: say nothing.
  }
  const t = event.tool_input ?? {};
  const path = String(t.file_path ?? "");
  if (/\.env[^/\\]*\.local$/.test(path)) process.exit(0); // .env.local is where keys belong

  const text = [t.content, t.new_string, ...(t.edits ?? []).map((e) => e.new_string)]
    .filter((x) => typeof x === "string")
    .join("\n");

  for (const [name, re] of PATTERNS) {
    if (re.test(text)) {
      // Exit code 2 blocks the edit and shows this message to Claude.
      process.stderr.write(
        `Blocked: the change to ${path} contains what looks like a ${name}. ` +
          `Keys go in .env.local or the Vercel or Supabase settings page, never in code. ` +
          `Read the value from process.env instead.\n`,
      );
      process.exit(2);
    }
  }
  process.exit(0);
});
