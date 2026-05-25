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

function hasFlag(args, name) {
  return args.includes(name);
}

function printHelp() {
  console.log(`shmuggingface

Usage:
  shmuggingface build --config shmuggingface.config.mjs --out dist [--strict-config] [--validate-hf]

Commands:
  build    Generate a static Cloudflare Pages-ready review app.

Options:
  --strict-config    Fail when the config contains deprecated or unknown fields.
  --validate-hf      Run optional Hugging Face-facing validation checks.
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
  const result = await generateSite(config, {
    outDir,
    configDir: resolve(configPath, ".."),
    validation: hasFlag(args, "--strict-config") ? "strict" : "warn",
    huggingFaceValidation: hasFlag(args, "--validate-hf"),
  });
  if (result.warnings.length) {
    console.warn("Config warnings:");
    for (const warning of result.warnings) {
      console.warn(`- ${warning}`);
    }
  }
  if (result.validationWarnings.length) {
    console.warn("Hugging Face validation warnings:");
    for (const warning of result.validationWarnings) {
      console.warn(`- ${warning}`);
    }
  }
  console.log(`Generated ${result.files.length} files in ${result.outDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
