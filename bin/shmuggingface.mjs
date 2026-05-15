#!/usr/bin/env node
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { generateSite } from "../src/generate.mjs";

function readFlag(args, name, fallback) {
  const index = args.indexOf(name);
  if (index === -1) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`Missing value for ${name}`);
  }
  return value;
}

function printHelp() {
  console.log(`shmuggingface

Usage:
  shmuggingface build --config shmuggingface.config.mjs --out dist

Commands:
  build    Generate a static Cloudflare Pages-ready review app.
`);
}

async function main() {
  const [, , command, ...args] = process.argv;
  if (!command || command === "--help" || command === "-h") {
    printHelp();
    return;
  }
  if (command !== "build") {
    throw new Error(`Unknown command: ${command}`);
  }

  const configPath = resolve(readFlag(args, "--config", "shmuggingface.config.mjs"));
  const outDir = resolve(readFlag(args, "--out", "dist"));
  const module = await import(pathToFileURL(configPath).href);
  const config = module.default ?? module.config;
  if (!config) {
    throw new Error(`Config ${configPath} must export default or named config`);
  }
  const result = await generateSite(config, { outDir, configDir: resolve(configPath, "..") });
  console.log(`Generated ${result.files.length} files in ${result.outDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
