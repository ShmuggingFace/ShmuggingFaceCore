import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSite } from "../src/generate.mjs";

test("generateSite writes platform pages and mock notice", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  const result = await generateSite({
    site: { title: "Review" },
    datasets: [{
      title: "Tiny Mock",
      columns: ["id", "label"],
      rows: [{ id: "1", label: "demo" }],
      files: [{ path: "data/train.csv", size: "1 KB" }],
    }],
  }, { outDir });

  assert.ok(result.files.includes("hf/tiny-mock/index.html"));
  assert.ok(result.files.includes("kaggle/tiny-mock/index.html"));
  const html = await readFile(join(outDir, "index.html"), "utf8");
  assert.match(html, /ShmuggingFace review mock/);
  assert.match(html, /Shmaggle/);
});
