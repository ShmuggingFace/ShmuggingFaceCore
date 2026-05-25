import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import assert from "node:assert/strict";
import { generateSite } from "../src/generate.mjs";

const execFileAsync = promisify(execFile);
const cliPath = fileURLToPath(new URL("../bin/shmuggingface.mjs", import.meta.url));

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
  assert.match(html, /class="home-shell"/);
  assert.match(html, /mock dataset ready for review/);
  assert.match(html, /href="\/hf\/tiny-mock\/">ShmuggingFace<\/a>/);
  assert.match(html, /href="\/kaggle\/tiny-mock\/">Shmaggle<\/a>/);
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
  assert.match(kaggleHtml, /kg-sticky-repo-header/);
  assert.match(kaggleHtml, /Data Card/);
  assert.match(kaggleHtml, /href="\/kaggle\/tiny-mock\/code\/">Code/);
  assert.match(kaggleHtml, /href="\/kaggle\/tiny-mock\/discussion\/">Discussion/);
  assert.match(kaggleHtml, /href="\/kaggle\/tiny-mock\/suggestions\/">Suggestions/);
  assert.match(kaggleHtml, /About Dataset/);
  assert.match(kaggleHtml, /data-kg-explorer/);
  assert.match(kaggleHtml, /kg-de-about/);
  assert.match(kaggleHtml, /Detail/);
  assert.match(kaggleHtml, /Compact/);
  assert.match(kaggleHtml, /Column/);
  assert.match(kaggleHtml, /data-kg-column-count/);
  assert.match(kaggleHtml, /data-kg-column-toggle="0"/);
  assert.doesNotMatch(kaggleHtml, /data-kg-column-toggle="0"[^>]*disabled/);
  assert.match(kaggleHtml, /Data Explorer/);
  assert.match(kaggleHtml, /1 file/);
  assert.match(kaggleHtml, /data-kg-metadata-collapse/);
  assert.match(kaggleHtml, /data-kg-metadata-toggle/);
  assert.match(kaggleHtml, /aria-expanded="true" aria-controls="kg-metadata-panel-0"/);
  assert.match(kaggleHtml, /aria-controls="kg-metadata-panel-0"/);
  assert.match(kaggleHtml, /kg-metadata-person/);
  assert.match(kaggleHtml, /href="\/downloads\/tiny-mock\/data\/train\.csv" download>.*Download/);
  assert.match(kaggleHtml, /kaggle datasets download -d dataset-team\/tiny-mock/);
  assert.match(kaggleHtml, /kg-social-heading/);
  assert.match(kaggleHtml, /kg-survey-pills/);
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

test("generateSite renders release review config fields", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  const sourceDir = await mkdtemp(join(tmpdir(), "shmuggingface-source-"));
  await writeFile(join(sourceDir, "train.csv"), "id,label\n1,demo\n");
  await writeFile(join(sourceDir, "cover.png"), Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJ5jB2N6wAAAABJRU5ErkJggg==",
    "base64",
  ));
  const renderedDescription = `<h2>Release Notes</h2>
<table><thead><tr><th>tier</th></tr></thead><tbody><tr><td>intro</td></tr></tbody></table>
<pre><code>load_dataset("demo")</code></pre>`;

  const result = await generateSite({
    datasets: [{
      title: "Configurable Release",
      description: "## Release Notes\n\n| tier |\n| --- |\n| intro |\n\n```py\nload_dataset(\"demo\")\n```",
      descriptionHtml: renderedDescription,
      coverImage: "cover.png",
      splits: ["train", "valid", "test"],
      subsets: ["intro", "intermediate", "advanced"],
      columns: ["id", "label"],
      rows: [{ id: "1", label: "demo" }],
      files: [{
        path: "data/train.csv",
        size: "1 KB",
        kind: "CSV",
        sourcePath: "train.csv",
        about: "Custom about text",
      }],
    }],
  }, { outDir, configDir: sourceDir });

  assert.ok(result.files.includes("assets/configurable-release/cover.png"));
  const hfHtml = await readFile(join(outDir, "hf/configurable-release/index.html"), "utf8");
  assert.match(hfHtml, /<h2>Release Notes<\/h2>/);
  assert.match(hfHtml, /<table>/);
  assert.match(hfHtml, /<pre><code>load_dataset\("demo"\)<\/code><\/pre>/);
  assert.doesNotMatch(hfHtml, /## Release Notes/);
  assert.match(hfHtml, /Subset \(3\)/);
  assert.match(hfHtml, /Split \(3\)/);
  assert.match(hfHtml, />intro</);
  assert.match(hfHtml, />intermediate</);
  assert.match(hfHtml, />advanced</);
  assert.match(hfHtml, />valid · 1 rows</);

  const kaggleHtml = await readFile(join(outDir, "kaggle/configurable-release/index.html"), "utf8");
  assert.match(kaggleHtml, /<h2>Release Notes<\/h2>/);
  assert.match(kaggleHtml, /<table>/);
  assert.match(kaggleHtml, /<pre><code>load_dataset\("demo"\)<\/code><\/pre>/);
  assert.doesNotMatch(kaggleHtml, /## Release Notes/);
  assert.match(kaggleHtml, /<img src="\/assets\/configurable-release\/cover\.png" alt="Dataset cover image">/);
  assert.match(kaggleHtml, /Custom about text/);
});

test("generateSite prefers full-file profileStats in the Shmaggle explorer", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  await generateSite({
    datasets: [{
      title: "Full Profile Dataset",
      rowCount: 10000,
      columns: ["is_active", "score"],
      rows: [{ is_active: "yes", score: "0.7" }],
      profileStats: {
        files: {
          "data/full.csv": {
            rowCount: 10000,
            columns: {
              is_active: {
                uniqueCount: 2,
                nullRate: 0,
                topValues: [
                  { value: "yes", count: 6100 },
                  { value: "no", count: 3900 },
                ],
              },
              score: {
                uniqueCount: 7821,
                nullRate: 0.015,
                min: 0,
                max: 1,
                topValues: [{ value: "0.7", count: 180 }],
              },
            },
          },
        },
      },
      files: [{ path: "data/full.csv", size: "2 MB", downloadUrl: "https://example.com/full.csv" }],
    }],
  }, { outDir });

  const kaggleHtml = await readFile(join(outDir, "kaggle/full-profile-dataset/index.html"), "utf8");
  assert.match(kaggleHtml, /Full-file profile stats \(10,000 rows\)/);
  assert.doesNotMatch(kaggleHtml, /Preview-sample stats/);
  assert.match(kaggleHtml, /2 unique/);
  assert.match(kaggleHtml, /yes<\/dt><dd>61%<\/dd>/);
  assert.match(kaggleHtml, /no<\/dt><dd>39%<\/dd>/);
  assert.match(kaggleHtml, /7,821 unique/);
  assert.match(kaggleHtml, /1\.5% null/);
  assert.match(kaggleHtml, /0 - 1/);
});

test("generateSite labels dataset-level profileStats honestly", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  await generateSite({
    datasets: [{
      title: "Dataset Profile Dataset",
      columns: ["label"],
      rows: [{ label: "demo" }],
      profileStats: {
        rowCount: 50,
        columns: {
          label: {
            uniqueCount: 3,
            topValues: [{ value: "demo", count: 25 }],
          },
        },
      },
      files: [
        { path: "data/train.csv", size: "1 KB", downloadUrl: "https://example.com/train.csv" },
        { path: "data/test.csv", size: "1 KB", downloadUrl: "https://example.com/test.csv" },
      ],
    }],
  }, { outDir });

  const kaggleHtml = await readFile(join(outDir, "kaggle/dataset-profile-dataset/index.html"), "utf8");
  assert.match(kaggleHtml, /Dataset-level profile stats \(50 rows\)/);
  assert.doesNotMatch(kaggleHtml, /Full-file profile stats/);
});

test("generateSite renders relational artifact groups and split row counts", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  const sourceDir = await mkdtemp(join(tmpdir(), "shmuggingface-source-"));
  await writeFile(join(sourceDir, "customers.csv"), "customer_id,name\n1,Ada\n");
  await writeFile(join(sourceDir, "orders.csv"), "order_id,customer_id\n1,1\n");
  await writeFile(join(sourceDir, "README.md"), "# docs\n");

  await generateSite({
    datasets: [{
      title: "Relational Release",
      rowCount: 2000,
      subsets: ["public", "private"],
      splits: ["train", "validation"],
      splitRowCounts: {
        public: { train: 1500, validation: 500 },
        private: { train: 10, validation: 5 },
      },
      columns: ["customer_id", "name"],
      rows: [{ customer_id: "1", name: "Ada" }],
      files: [{ path: "legacy/preview.csv", size: "1 KB", downloadUrl: "https://example.com/preview.csv" }],
      tableGroups: [{
        title: "Core tables",
        description: "Normalized relational tables",
        files: [
          {
            path: "tables/customers.csv",
            size: "2 KB",
            kind: "CSV",
            sourcePath: "customers.csv",
            rowCount: 1200,
            columnDtypes: { customer_id: "int64", name: "string" },
            schema: { primaryKey: ["customer_id"], columns: [{ name: "customer_id", dtype: "int64" }] },
          },
          {
            path: "tables/orders.csv",
            size: "3 KB",
            kind: "CSV",
            sourcePath: "orders.csv",
            rowCount: 800,
            columnDtypes: { order_id: "int64", customer_id: "int64" },
          },
        ],
      }],
      docsGroups: [{
        title: "Release docs",
        files: [{ path: "docs/README.md", size: "1 KB", kind: "Markdown", sourcePath: "README.md" }],
      }],
      notebookGroups: [{
        title: "Audit notebooks",
        files: [{ path: "notebooks/audit.ipynb", size: "8 KB", downloadUrl: "https://example.com/audit.ipynb" }],
      }],
      validationGroups: [{
        title: "Validation manifests",
        files: [{ path: "validation/manifest.json", size: "4 KB", downloadUrl: "https://example.com/manifest.json" }],
      }],
    }],
  }, { outDir, configDir: sourceDir });

  const manifest = JSON.parse(await readFile(join(outDir, "manifest.json"), "utf8"));
  assert.equal(manifest.datasets[0].files.length, 1);
  assert.equal(manifest.datasets[0].artifactGroups.length, 4);
  assert.equal(manifest.datasets[0].allFiles, undefined);
  assert.deepEqual(manifest.datasets[0].splitRowCounts, {
    public: { train: 1500, validation: 500 },
    private: { train: 10, validation: 5 },
  });
  assert.deepEqual(manifest.datasets[0].artifactGroups[0].files[0].columnDtypes, { customer_id: "int64", name: "string" });

  const hfHtml = await readFile(join(outDir, "hf/relational-release/index.html"), "utf8");
  assert.match(hfHtml, /validation · 500 rows/);
  assert.match(hfHtml, /Preview files/);
  assert.match(hfHtml, /legacy\/preview\.csv/);
  assert.match(hfHtml, /Core tables/);
  assert.match(hfHtml, /2 schema columns/);
  const hfFilesHtml = await readFile(join(outDir, "hf/relational-release/files-and-versions/index.html"), "utf8");
  assert.match(hfFilesHtml, /Preview files/);
  assert.match(hfFilesHtml, /legacy\/preview\.csv/);
  assert.match(hfFilesHtml, /Core tables/);
  assert.match(hfFilesHtml, /Normalized relational tables/);
  assert.match(hfFilesHtml, /tables\/customers\.csv/);
  assert.match(hfFilesHtml, /1,200 rows/);
  const kaggleHtml = await readFile(join(outDir, "kaggle/relational-release/index.html"), "utf8");
  assert.match(kaggleHtml, /Data files/);
  assert.match(kaggleHtml, /Preview files/);
  assert.match(kaggleHtml, /legacy\/preview\.csv/);
  assert.match(kaggleHtml, /Core tables/);
  assert.match(kaggleHtml, /tables\/orders\.csv/);
  assert.match(kaggleHtml, /public\/train: 1,500, public\/validation: 500, private\/train: 10, private\/validation: 5/);
  assert.match(kaggleHtml, /pd\.read_csv\(&quot;legacy\/preview\.csv&quot;\)/);
  assert.equal(await readFile(join(outDir, "downloads/relational-release/tables/customers.csv"), "utf8"), "customer_id,name\n1,Ada\n");
  assert.equal(await readFile(join(outDir, "downloads/relational-release/docs/README.md"), "utf8"), "# docs\n");
});

test("generateSite validates nested artifactGroups keys in strict mode", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  await assert.rejects(
    generateSite({
      datasets: [{
        title: "Bad Artifact Groups",
        rows: [{ id: "1" }],
        files: [{ path: "data/full.csv", size: "1 KB", downloadUrl: "https://example.com/full.csv" }],
        artifactGroups: {
          table: [{
            title: "Typo group",
            files: [{ path: "tables/full.csv", size: "1 KB", downloadUrl: "https://example.com/full.csv" }],
          }],
        },
      }],
    }, { outDir, validation: "strict" }),
    /datasets\[0\]\.artifactGroups\.table is not a recognized config field/,
  );
});

test("generateSite supports grouped artifacts without a flat files array", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  const sourceDir = await mkdtemp(join(tmpdir(), "shmuggingface-source-"));
  await writeFile(join(sourceDir, "metrics.csv"), "metric,value\nrows,10\n");

  await generateSite({
    datasets: [{
      title: "Grouped Only",
      rows: [{ metric: "rows", value: "10" }],
      artifactGroups: {
        validation: [{
          title: "Validation outputs",
          files: [{ path: "validation/metrics.csv", size: "1 KB", kind: "CSV", sourcePath: "metrics.csv" }],
        }],
      },
    }],
  }, { outDir, configDir: sourceDir });

  const manifest = JSON.parse(await readFile(join(outDir, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.datasets[0].files, []);
  assert.equal(manifest.datasets[0].allFiles, undefined);
  assert.equal(manifest.datasets[0].artifactGroups[0].title, "Validation outputs");
  const hfFilesHtml = await readFile(join(outDir, "hf/grouped-only/files-and-versions/index.html"), "utf8");
  assert.match(hfFilesHtml, /Validation outputs/);
  assert.match(hfFilesHtml, /validation\/metrics\.csv/);
  assert.equal(await readFile(join(outDir, "downloads/grouped-only/validation/metrics.csv"), "utf8"), "metric,value\nrows,10\n");
});

test("generateSite labels row-derived explorer stats as preview-sample stats", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  await generateSite({
    datasets: [{
      title: "Sample Profile Dataset",
      rowCount: 10000,
      rows: [
        { is_active: "yes" },
        { is_active: "yes" },
      ],
      files: [{ path: "data/preview.csv", size: "1 KB", downloadUrl: "https://example.com/preview.csv" }],
    }],
  }, { outDir });

  const kaggleHtml = await readFile(join(outDir, "kaggle/sample-profile-dataset/index.html"), "utf8");
  assert.match(kaggleHtml, /10,000 rows/);
  assert.match(kaggleHtml, /Preview-sample stats \(2 rows\)/);
  assert.doesNotMatch(kaggleHtml, /Full-file profile stats/);
  assert.match(kaggleHtml, /1 unique/);
  assert.doesNotMatch(kaggleHtml, /9,?000 unique/);
});

test("generateSite falls back to sample stats when profileStats is empty or malformed", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  const result = await generateSite({
    datasets: [{
      title: "Malformed Profile Dataset",
      rowCount: 100,
      columns: ["status"],
      rows: [{ status: "active" }],
      profileStats: {
        columns: {
          status: {
            unique_count: 2,
          },
        },
      },
      files: [{ path: "data/preview.csv", size: "1 KB", downloadUrl: "https://example.com/preview.csv" }],
    }],
  }, { outDir });

  assert.match(result.warnings.join("\n"), /datasets\[0\]\.profileStats\.columns\.status\.unique_count is not a recognized config field/);
  assert.match(result.warnings.join("\n"), /datasets\[0\]\.profileStats\.columns must include at least one usable column profile/);
  const kaggleHtml = await readFile(join(outDir, "kaggle/malformed-profile-dataset/index.html"), "utf8");
  assert.match(kaggleHtml, /Preview-sample stats \(1 rows\)/);
  assert.doesNotMatch(kaggleHtml, /Full-file profile stats/);
});

test("generateSite fails strict validation for invalid profileStats", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  await assert.rejects(
    generateSite({
      datasets: [{
        title: "Strict Profile Dataset",
        columns: ["status"],
        rows: [{ status: "active" }],
        profileStats: {
          files: {
            "data/full.csv": {
              rowCount: "many",
              columns: {
                status: {
                  unique_count: 2,
                  topValues: "active",
                },
              },
            },
          },
        },
        files: [{ path: "data/full.csv", size: "1 KB", downloadUrl: "https://example.com/full.csv" }],
      }],
    }, { outDir, validation: "strict" }),
    /Config validation failed:[\s\S]*profileStats\.files\.data\/full\.csv\.rowCount must be a finite number/,
  );
});

test("generateSite reports config-contract warnings and supports strict validation", async () => {
  const outDir = await mkdtemp(join(tmpdir(), "shmuggingface-"));
  const result = await generateSite({
    extraTopLevel: true,
    mockOnly: { ignored: true },
    meta: { source: "test-build" },
    site: {
      title: "Contract Review",
      unexpectedSiteField: true,
      mockOnly: { ignored: true },
      meta: { run: "local" },
    },
    datasets: [{
      title: "Contract Dataset",
      unexpectedDatasetField: true,
      kaggleUsability: "10.00",
      kaggleMedals: "gold",
      mockOnly: {
        kaggleUsability: "9.75",
        kaggleMedals: "bronze",
        unknownMockOnly: true,
      },
      meta: { tier: "intro" },
      columns: ["id"],
      rows: [{ id: "1" }],
      files: [{
        path: "data/full.csv",
        size: "1 KB",
        downloadUrl: "https://example.com/full.csv",
        unexpectedFileField: true,
        mockOnly: { ignored: true },
        meta: { sha256: "abc123" },
      }],
    }],
  }, { outDir });

  assert.match(result.warnings.join("\n"), /config\.extraTopLevel is not a recognized config field/);
  assert.match(result.warnings.join("\n"), /config\.mockOnly is not a recognized config field/);
  assert.match(result.warnings.join("\n"), /config\.site\.unexpectedSiteField is not a recognized config field/);
  assert.match(result.warnings.join("\n"), /config\.site\.mockOnly is not a recognized config field/);
  assert.match(result.warnings.join("\n"), /datasets\[0\]\.unexpectedDatasetField is not a recognized config field/);
  assert.match(result.warnings.join("\n"), /datasets\[0\]\.files\[0\]\.unexpectedFileField is not a recognized config field/);
  assert.match(result.warnings.join("\n"), /datasets\[0\]\.files\[0\]\.mockOnly is not a recognized config field/);
  assert.match(result.warnings.join("\n"), /datasets\[0\]\.mockOnly\.unknownMockOnly is not a recognized config field/);
  assert.match(result.warnings.join("\n"), /datasets\[0\]\.kaggleUsability is deprecated/);
  assert.match(result.warnings.join("\n"), /datasets\[0\]\.kaggleMedals is deprecated/);

  const manifest = JSON.parse(await readFile(join(outDir, "manifest.json"), "utf8"));
  assert.deepEqual(manifest.meta, { source: "test-build" });
  assert.deepEqual(manifest.site.meta, { run: "local" });
  assert.deepEqual(manifest.datasets[0].meta, { tier: "intro" });
  assert.deepEqual(manifest.datasets[0].files[0].meta, { sha256: "abc123" });
  assert.deepEqual(manifest.datasets[0].mockOnly, {
    kaggleUsability: "9.75",
    kaggleMedals: "bronze",
  });

  const kaggleHtml = await readFile(join(outDir, "kaggle/contract-dataset/index.html"), "utf8");
  assert.match(kaggleHtml, /9\.75/);
  assert.match(kaggleHtml, /Mock platform-computed value/);
  assert.match(kaggleHtml, /Mock platform-computed medal: bronze/);

  await assert.rejects(
    generateSite({
      datasets: [{
        title: "Strict Dataset",
        unexpectedDatasetField: true,
        columns: ["id"],
        rows: [{ id: "1" }],
        files: [{ path: "data/full.csv", size: "1 KB", downloadUrl: "https://example.com/full.csv" }],
      }],
    }, { outDir, validation: "strict" }),
    /Config validation failed:\ndatasets\[0\]\.unexpectedDatasetField is not a recognized config field/,
  );
});

test("CLI prints config warnings and fails strict config validation", async () => {
  const sourceDir = await mkdtemp(join(tmpdir(), "shmuggingface-cli-"));
  const outDir = join(sourceDir, "dist");
  const configPath = join(sourceDir, "shmuggingface.config.mjs");
  await writeFile(configPath, `export default {
    unexpectedTopLevel: true,
    datasets: [{
      title: "CLI Contract",
      unexpectedDatasetField: true,
      columns: ["id"],
      rows: [{ id: "1" }],
      files: [{ path: "data/full.csv", size: "1 KB", downloadUrl: "https://example.com/full.csv" }]
    }]
  };`);

  const warnResult = await execFileAsync(process.execPath, [cliPath, "build", "--config", configPath, "--out", outDir]);
  assert.match(warnResult.stdout, /Generated \d+ files/);
  assert.match(warnResult.stderr, /Config warnings:/);
  assert.match(warnResult.stderr, /config\.unexpectedTopLevel is not a recognized config field/);
  assert.match(warnResult.stderr, /datasets\[0\]\.unexpectedDatasetField is not a recognized config field/);

  await assert.rejects(
    execFileAsync(process.execPath, [cliPath, "build", "--config", configPath, "--out", outDir, "--strict-config"]),
    (error) => {
      assert.equal(error.code, 1);
      assert.match(error.stderr, /Config validation failed:/);
      assert.match(error.stderr, /config\.unexpectedTopLevel is not a recognized config field/);
      return true;
    },
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
