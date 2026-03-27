import fs from "node:fs";
import path from "node:path";

function loadEnvExample(): void {
  const envExamplePath = path.join(__dirname, "..", ".env.example");
  if (!fs.existsSync(envExamplePath)) return;

  const contents = fs.readFileSync(envExamplePath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;

    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadEnvExample();

