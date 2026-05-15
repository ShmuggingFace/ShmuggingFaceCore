import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSite } from "../src/generate.mjs";

test("generateSite writes platform pages and mock notice", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  const sourceDir = await mkdtemp(join(tmpdir(), "shmuggingface-source-"));
  await writeFile(join(sourceDir, "train.csv"), "id,label\n1,demo\n");
  const result = await generateSite({
    site: { title: "Review" },
    datasets: [{
      title: "Tiny Mock",
      columns: ["id", "label"],
      rows: [{ id: "1", label: "demo" }],
      files: [{ path: "data/train.csv", size: "1 KB", sourcePath: "train.csv" }],
    }],
  }, { outDir, configDir: sourceDir });

  assert.ok(result.files.includes("hf/tiny-mock/index.html"));
  assert.ok(result.files.includes("kaggle/tiny-mock/index.html"));
  assert.ok(result.files.includes("downloads/tiny-mock/data/train.csv"));
  const html = await readFile(join(outDir, "index.html"), "utf8");
  assert.match(html, /ShmuggingFace review mock/);
  assert.match(html, /Shmaggle/);
  assert.equal(await readFile(join(outDir, "downloads/tiny-mock/data/train.csv"), "utf8"), "id,label\n1,demo\n");
});

test("generateSite requires download backing for listed files", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  await assert.rejects(
    generateSite({
      datasets: [{
        title: "Missing Backing",
        columns: ["id"],
        rows: [{ id: "1" }],
        files: [{ path: "data/train.csv", size: "1 KB" }],
      }],
    }, { outDir }),
    /must define sourcePath or downloadUrl/,
  );
});

test("generateSite leaves external large-file links out of downloads", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  const result = await generateSite({
    datasets: [{
      title: "Large Mock",
      columns: ["id"],
      rows: [{ id: "1" }],
      files: [{
        path: "data/big.parquet",
        size: "8 GB",
        kind: "Parquet",
        storage: "Git LFS",
        downloadUrl: "https://example.com/big.parquet",
      }],
    }],
  }, { outDir });

  assert.ok(!result.files.includes("downloads/large-mock/data/big.parquet"));
  const html = await readFile(join(outDir, "hf/large-mock/index.html"), "utf8");
  assert.match(html, /https:\/\/example.com\/big.parquet/);
  assert.match(html, /Open Git LFS/);
});
