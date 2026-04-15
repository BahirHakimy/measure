import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";

const siteRoot = resolve(import.meta.dirname, "..");
const distDir = resolve(siteRoot, "dist");
const outputZip = resolve(siteRoot, "pixelgrade-extension.zip");

if (!existsSync(distDir)) {
  console.error("Missing build output. Run `corepack pnpm --filter ./apps/site build` first.");
  process.exit(1);
}

if (existsSync(outputZip)) {
  rmSync(outputZip);
}

const result = spawnSync("zip", ["-r", outputZip, "."], {
  cwd: distDir,
  stdio: "inherit",
});

if (result.error) {
  console.error("Failed to create ZIP archive:", result.error.message);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`Created ${outputZip}`);
