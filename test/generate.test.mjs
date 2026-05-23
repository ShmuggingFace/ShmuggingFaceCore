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
      contactName: "Demo Reviewer",
      contactEmail: "demo.reviewer@example.test",
      rowCount: 1234,
      columns: ["id", "label"],
      rows: [{ id: "1", label: "demo" }],
      files: [{ path: "data/train.csv", size: "1 KB", sourcePath: "train.csv" }],
    }],
  }, { outDir, configDir: sourceDir });

  assert.ok(result.files.includes("hf/tiny-mock/index.html"));
  assert.ok(result.files.includes("hf/tiny-mock/data-studio/index.html"));
  assert.ok(result.files.includes("hf/tiny-mock/files-and-versions/index.html"));
  assert.ok(result.files.includes("hf/tiny-mock/community/index.html"));
  assert.ok(result.files.includes("kaggle/tiny-mock/index.html"));
  assert.ok(result.files.includes("kaggle/tiny-mock/code/index.html"));
  assert.ok(result.files.includes("kaggle/tiny-mock/discussion/index.html"));
  assert.ok(result.files.includes("kaggle/tiny-mock/suggestions/index.html"));
  assert.ok(result.files.includes("downloads/tiny-mock/data/train.csv"));
  const html = await readFile(join(outDir, "index.html"), "utf8");
  assert.match(html, /ShmuggingFace review mock/);
  assert.match(html, /Shmaggle/);
  assert.equal(await readFile(join(outDir, "downloads/tiny-mock/data/train.csv"), "utf8"), "id,label\n1,demo\n");
  const hfHtml = await readFile(join(outDir, "hf/tiny-mock/index.html"), "utf8");
  assert.match(hfHtml, /mailto:demo\.reviewer@example\.test/);
  assert.match(hfHtml, /Demo Reviewer/);
  assert.match(hfHtml, /1,234/);
  assert.match(hfHtml, /data-sidebar-action="use"/);
  assert.match(hfHtml, /Dask/);
  assert.match(hfHtml, /data-sidebar-action="more"/);
  assert.match(hfHtml, /Report repository/);
  assert.doesNotMatch(hfHtml, /Settings/);
  const studioHtml = await readFile(join(outDir, "hf/tiny-mock/data-studio/index.html"), "utf8");
  assert.match(studioHtml, /data-studio="tiny-mock"/);
  assert.match(studioHtml, /Data Studio/);
  assert.match(studioHtml, /DATA STUDIO|Get Started|data-studio-split/i);
  assert.match(studioHtml, /data-studio-tab="sql"/);
  assert.match(studioHtml, /Select a subset\/split to load the data/);
  const filesHtml = await readFile(join(outDir, "hf/tiny-mock/files-and-versions/index.html"), "utf8");
  assert.match(filesHtml, /data-files-page="tiny-mock"/);
  assert.match(filesHtml, /History: 8 commits/);
  assert.match(filesHtml, /data\/train\.csv/);
  assert.match(filesHtml, /downloads\/tiny-mock\/data\/train\.csv/);
  assert.match(filesHtml, /Contribute/);
  const communityHtml = await readFile(join(outDir, "hf/tiny-mock/community/index.html"), "utf8");
  assert.match(communityHtml, /data-community-page="tiny-mock"/);
  assert.match(communityHtml, /New discussion/);
  assert.match(communityHtml, /Pull requests/);
  assert.match(communityHtml, /Filter by title/);
  assert.match(communityHtml, /How should reviewers interpret the mock row preview/);
  const kaggleHtml = await readFile(join(outDir, "kaggle/tiny-mock/index.html"), "utf8");
  assert.match(kaggleHtml, /class="kg-wordmark"[^>]*>shmaggle</);
  assert.match(kaggleHtml, /class="kg-sidebar"/);
  assert.match(kaggleHtml, /class="kg-search"/);
  assert.match(kaggleHtml, /Data Card/);
  assert.match(kaggleHtml, /href="\/kaggle\/tiny-mock\/code\/">Code/);
  assert.match(kaggleHtml, /href="\/kaggle\/tiny-mock\/discussion\/">Discussion/);
  assert.match(kaggleHtml, /href="\/kaggle\/tiny-mock\/suggestions\/">Suggestions/);
  assert.match(kaggleHtml, /About Dataset/);
  assert.match(kaggleHtml, /data-kg-explorer/);
  assert.match(kaggleHtml, /Detail/);
  assert.match(kaggleHtml, /Compact/);
  assert.match(kaggleHtml, /Column/);
  assert.match(kaggleHtml, /data-kg-column-count/);
  assert.match(kaggleHtml, /data-kg-column-toggle="0"/);
  assert.doesNotMatch(kaggleHtml, /data-kg-column-toggle="0"[^>]*disabled/);
  assert.match(kaggleHtml, /Data Explorer/);
  assert.match(kaggleHtml, /1 file/);
  assert.match(kaggleHtml, /data-kg-metadata-toggle/);
  assert.match(kaggleHtml, /aria-controls="kg-metadata-panel-0"/);
  assert.match(kaggleHtml, /Review access is mocked for this Shmaggle preview only/);
  assert.match(kaggleHtml, /href="\/downloads\/tiny-mock\/data\/train\.csv" download>.*Download/);
  assert.match(kaggleHtml, /kaggle datasets download -d dataset-team\/tiny-mock/);
  const kaggleCodeHtml = await readFile(join(outDir, "kaggle/tiny-mock/code/index.html"), "utf8");
  assert.match(kaggleCodeHtml, /class="active" href="\/kaggle\/tiny-mock\/code\/">Code/);
  assert.match(kaggleCodeHtml, /New Notebook/);
  assert.match(kaggleCodeHtml, /Download and inspect files/);
  const kaggleDiscussionHtml = await readFile(join(outDir, "kaggle/tiny-mock/discussion/index.html"), "utf8");
  assert.match(kaggleDiscussionHtml, /class="active" href="\/kaggle\/tiny-mock\/discussion\/">Discussion/);
  assert.match(kaggleDiscussionHtml, /New Topic/);
  assert.match(kaggleDiscussionHtml, /Search discussions/);
  const kaggleSuggestionsHtml = await readFile(join(outDir, "kaggle/tiny-mock/suggestions/index.html"), "utf8");
  assert.match(kaggleSuggestionsHtml, /class="active" href="\/kaggle\/tiny-mock\/suggestions\/">Suggestions/);
  assert.match(kaggleSuggestionsHtml, /No suggestions yet/);
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
  const filesHtml = await readFile(join(outDir, "hf/large-mock/files-and-versions/index.html"), "utf8");
  assert.match(filesHtml, /https:\/\/example.com\/big.parquet/);
  assert.match(filesHtml, /data-storage="Git LFS"/);
});
