import { mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

const MOCK_NOTICE =
  "This is a ShmuggingFace review mock. It is not Hugging Face, Kaggle, or a real dataset release.";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function slugify(value) {
  return String(value ?? "dataset")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "dataset";
}

function requireString(object, key, label) {
  const value = object?.[key];
  if (!value || typeof value !== "string") {
    throw new Error(`${label}.${key} must be a non-empty string`);
  }
  return value;
}

function normalizeConfig(config) {
  const site = config.site ?? {};
  const datasets = config.datasets ?? [];
  if (!Array.isArray(datasets) || datasets.length === 0) {
    throw new Error("config.datasets must contain at least one dataset");
  }
  return {
    site: {
      title: site.title || "ShmuggingFace review mock",
      owner: site.owner || "Dataset team",
      visibility: site.visibility || "public mock",
      reviewerHint: site.reviewerHint || "Review the release story, previews, file list, and download behavior before publishing.",
    },
    datasets: datasets.map((dataset, index) => {
      const title = requireString(dataset, "title", `datasets[${index}]`);
      return {
        slug: slugify(dataset.slug || title),
        title,
        owner: dataset.owner || site.owner || "dataset-team",
        subtitle: dataset.subtitle || "",
        license: dataset.license || "TBD",
        task: dataset.task || "Dataset",
        language: dataset.language || "n/a",
        updated: dataset.updated || new Date().toISOString().slice(0, 10),
        downloads: dataset.downloads || "0",
        likes: dataset.likes || "0",
        kaggleUsability: dataset.kaggleUsability || "8.8",
        kaggleMedals: dataset.kaggleMedals || "Bronze",
        description: dataset.description || "",
        tags: dataset.tags || [],
        files: dataset.files || [],
        columns: dataset.columns || [],
        rows: dataset.rows || [],
        discussions: dataset.discussions || [],
      };
    }),
  };
}

function datasetSelect(datasets, activeSlug, platform) {
  return datasets
    .map((dataset) => {
      const href = platform === "hf" ? `/hf/${dataset.slug}/` : `/kaggle/${dataset.slug}/`;
      const active = dataset.slug === activeSlug ? " aria-current=\"page\"" : "";
      return `<a${active} href="${href}">${escapeHtml(dataset.title)}</a>`;
    })
    .join("");
}

function layout({ title, body, site, nav = "" }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ctext y='50' font-size='50'%3E%F0%9F%98%8F%3C/text%3E%3C/svg%3E">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body>
  <div class="mock-ribbon">${escapeHtml(MOCK_NOTICE)}</div>
  <header class="topbar">
    <a class="brand" href="/"><span class="brand-mark">😏</span><span>ShmuggingFace</span></a>
    <nav>${nav}<a href="/manifest.json">Manifest</a></nav>
  </header>
  <main>${body}</main>
  <footer>
    <strong>${escapeHtml(site.title)}</strong>
    <span>${escapeHtml(site.visibility)}</span>
    <span>${escapeHtml(MOCK_NOTICE)}</span>
  </footer>
</body>
</html>`;
}

function renderHome(model) {
  const primary = model.datasets[0];
  const datasetLinks = model.datasets
    .map((dataset) => `<li><a href="/hf/${dataset.slug}/">${escapeHtml(dataset.title)}</a><span>${escapeHtml(dataset.task)}</span></li>`)
    .join("");
  const body = `<section class="home-hero">
    <p class="eyebrow">${escapeHtml(model.site.owner)} pre-release review</p>
    <h1>${escapeHtml(model.site.title)}</h1>
    <p>${escapeHtml(model.site.reviewerHint)}</p>
    <div class="platform-actions">
      <a class="platform-card hf-card" href="/hf/${primary.slug}/">
        <span class="platform-logo">😏 ShmuggingFace</span>
        <strong>Open Hugging Face-style dataset mock</strong>
        <span>Dataset card, files, viewer, discussions, and download affordances.</span>
      </a>
      <a class="platform-card kaggle-card" href="/kaggle/${primary.slug}/">
        <span class="platform-logo">Shmaggle</span>
        <strong>Open Kaggle-style dataset mock</strong>
        <span>Overview, data explorer, notebooks, usability cues, and file previews.</span>
      </a>
    </div>
  </section>
  <section class="dataset-list">
    <h2>Invented review datasets</h2>
    <ul>${datasetLinks}</ul>
  </section>`;
  return layout({ title: model.site.title, body, site: model.site });
}

function table(dataset) {
  const headers = dataset.columns.map((column) => `<th>${escapeHtml(column)}</th>`).join("");
  const rows = dataset.rows
    .slice(0, 8)
    .map((row) => `<tr>${dataset.columns.map((column) => `<td>${escapeHtml(row[column])}</td>`).join("")}</tr>`)
    .join("");
  return `<div class="table-shell"><table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table></div>`;
}

function files(dataset) {
  return dataset.files
    .map((file) => `<li><span>${escapeHtml(file.path)}</span><strong>${escapeHtml(file.size || "")}</strong><em>${escapeHtml(file.kind || "file")}</em><a href="/downloads/${dataset.slug}/${encodeURIComponent(file.path.split("/").pop())}.txt">Download mock</a></li>`)
    .join("");
}

function renderHf(model, dataset) {
  const nav = datasetSelect(model.datasets, dataset.slug, "hf");
  const body = `<section class="repo-header hf">
    <p class="eyebrow">Dataset repository mock</p>
    <h1>${escapeHtml(dataset.owner)} / ${escapeHtml(dataset.title)}</h1>
    <p>${escapeHtml(dataset.subtitle)}</p>
    <div class="chips">${dataset.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
  </section>
  <section class="tabs">
    <a class="active">Dataset card</a><a>Files and versions</a><a>Viewer</a><a>Community</a>
  </section>
  <section class="two-col">
    <article>
      <h2>Dataset card</h2>
      <p>${escapeHtml(dataset.description)}</p>
      <h3>Preview</h3>
      <div class="viewer-toolbar"><input value="" placeholder="Search rows"><button>Filter</button><button>Statistics</button><span>Page 1 of 3</span></div>
      ${table(dataset)}
    </article>
    <aside>
      <div class="stat-grid"><span>Downloads<strong>${escapeHtml(dataset.downloads)}</strong></span><span>Likes<strong>${escapeHtml(dataset.likes)}</strong></span><span>License<strong>${escapeHtml(dataset.license)}</strong></span><span>Language<strong>${escapeHtml(dataset.language)}</strong></span></div>
      <h3>Repository files</h3>
      <ul class="file-list">${files(dataset)}</ul>
      <h3>Community</h3>
      <ul class="discussion-list">${dataset.discussions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
    </aside>
  </section>`;
  return layout({ title: `${dataset.title} | ShmuggingFace`, body, site: model.site, nav });
}

function renderKaggle(model, dataset) {
  const nav = datasetSelect(model.datasets, dataset.slug, "kaggle");
  const body = `<section class="repo-header kaggle">
    <p class="eyebrow">Dataset page mock</p>
    <h1>${escapeHtml(dataset.title)}</h1>
    <p>${escapeHtml(dataset.subtitle)}</p>
    <div class="kaggle-actions"><button>New Notebook</button><button>Download</button><button>Copy API command</button></div>
  </section>
  <section class="tabs kaggle-tabs">
    <a class="active">Overview</a><a>Data</a><a>Code</a><a>Discussion</a><a>Activity</a>
  </section>
  <section class="two-col">
    <article>
      <h2>About this mock dataset</h2>
      <p>${escapeHtml(dataset.description)}</p>
      <h3>Data Explorer</h3>
      <div class="viewer-toolbar"><button>train.csv</button><button>sample_submission.csv</button><span>${escapeHtml(dataset.rows.length)} preview rows</span></div>
      ${table(dataset)}
    </article>
    <aside>
      <div class="score-card"><span>Usability</span><strong>${escapeHtml(dataset.kaggleUsability)}</strong><em>${escapeHtml(dataset.kaggleMedals)} mock medal</em></div>
      <h3>Files</h3>
      <ul class="file-list">${files(dataset)}</ul>
      <h3>Metadata</h3>
      <dl><dt>License</dt><dd>${escapeHtml(dataset.license)}</dd><dt>Task</dt><dd>${escapeHtml(dataset.task)}</dd><dt>Updated</dt><dd>${escapeHtml(dataset.updated)}</dd></dl>
    </aside>
  </section>`;
  return layout({ title: `${dataset.title} | Shmaggle`, body, site: model.site, nav });
}

function styles() {
  return `:root{color-scheme:light;--ink:#17202a;--muted:#596579;--line:#d9dee8;--panel:#ffffff;--bg:#f6f7f9;--hf:#ffb000;--kg:#20a7db;--green:#1e7f5c}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg)}a{color:inherit}.mock-ribbon{background:#1f2937;color:#fff;text-align:center;padding:8px 16px;font-size:13px;font-weight:700}.topbar{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800}.brand-mark{font-size:24px}.topbar nav{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.topbar nav a{font-size:14px;text-decoration:none;color:var(--muted)}.topbar nav a[aria-current=page]{color:var(--ink);font-weight:700}main{max-width:1180px;margin:0 auto;padding:28px}.home-hero{padding:52px 0 34px}.eyebrow{text-transform:uppercase;letter-spacing:.08em;font-size:12px;font-weight:800;color:var(--green);margin:0 0 10px}.home-hero h1,.repo-header h1{font-size:44px;line-height:1.05;margin:0 0 14px;letter-spacing:0}.home-hero p,.repo-header p{max-width:780px;color:var(--muted);font-size:18px;line-height:1.55}.platform-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:30px}.platform-card{min-height:210px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:24px;text-decoration:none;display:flex;flex-direction:column;gap:14px}.platform-card strong{font-size:24px}.platform-card span:last-child{color:var(--muted);line-height:1.45}.platform-logo{font-weight:900}.hf-card{border-top:6px solid var(--hf)}.kaggle-card{border-top:6px solid var(--kg)}.dataset-list{border-top:1px solid var(--line);padding-top:28px}.dataset-list ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}.dataset-list li{display:flex;justify-content:space-between;background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px 16px}.repo-header{border:1px solid var(--line);border-radius:8px;background:#fff;padding:26px}.repo-header.hf{border-top:6px solid var(--hf)}.repo-header.kaggle{border-top:6px solid var(--kg)}.chips{display:flex;gap:8px;flex-wrap:wrap}.chips span{border:1px solid var(--line);border-radius:999px;padding:5px 10px;font-size:13px;color:var(--muted)}.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-top:18px;overflow:auto}.tabs a{padding:14px 16px;text-decoration:none;color:var(--muted);white-space:nowrap}.tabs .active{color:var(--ink);font-weight:800;border-bottom:3px solid var(--hf)}.kaggle-tabs .active{border-bottom-color:var(--kg)}.two-col{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;margin-top:24px}article,aside{background:#fff;border:1px solid var(--line);border-radius:8px;padding:22px}h2{font-size:24px;margin:0 0 12px}h3{font-size:16px;margin:22px 0 10px}.viewer-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 0}.viewer-toolbar input,.viewer-toolbar button,.kaggle-actions button{border:1px solid var(--line);border-radius:6px;background:#fff;padding:9px 11px;font:inherit}.viewer-toolbar span{font-size:13px;color:var(--muted)}.table-shell{overflow:auto;border:1px solid var(--line);border-radius:8px}table{border-collapse:collapse;min-width:720px;width:100%;font-size:14px}th,td{border-bottom:1px solid var(--line);text-align:left;padding:10px 12px;vertical-align:top}th{background:#f0f3f7;font-size:12px;text-transform:uppercase;color:var(--muted)}.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.stat-grid span,.score-card{border:1px solid var(--line);border-radius:8px;padding:12px;color:var(--muted)}.stat-grid strong,.score-card strong{display:block;color:var(--ink);font-size:20px;margin-top:6px}.file-list,.discussion-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.file-list li{border:1px solid var(--line);border-radius:8px;padding:10px;display:grid;grid-template-columns:1fr auto;gap:4px 10px}.file-list span{font-weight:700}.file-list strong,.file-list em{color:var(--muted);font-size:13px}.file-list a{font-size:13px}.discussion-list li{padding:10px;border-left:3px solid var(--hf);background:#f8fafc}.kaggle-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.kaggle-actions button:first-child{background:#111827;color:#fff}.score-card strong{font-size:38px}dl{display:grid;grid-template-columns:auto 1fr;gap:8px 12px}dt{font-weight:800}dd{margin:0;color:var(--muted)}footer{max-width:1180px;margin:24px auto;padding:20px 28px;color:var(--muted);display:flex;gap:16px;flex-wrap:wrap;border-top:1px solid var(--line)}@media(max-width:820px){.topbar{height:auto;align-items:flex-start;gap:12px;padding:14px 18px;flex-direction:column}main{padding:18px}.home-hero h1,.repo-header h1{font-size:34px}.platform-actions,.two-col{grid-template-columns:1fr}.dataset-list li{align-items:flex-start;gap:6px;flex-direction:column}}`;
}

async function write(outDir, path, contents, files) {
  const target = join(outDir, path);
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, contents);
  files.push(path);
}

export async function generateSite(config, options = {}) {
  const model = normalizeConfig(config);
  const outDir = resolve(options.outDir || "dist");
  const files = [];
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await write(outDir, "index.html", renderHome(model), files);
  await write(outDir, "assets/styles.css", styles(), files);
  await write(outDir, "manifest.json", JSON.stringify({ ...model, mockNotice: MOCK_NOTICE }, null, 2), files);
  for (const dataset of model.datasets) {
    await write(outDir, `hf/${dataset.slug}/index.html`, renderHf(model, dataset), files);
    await write(outDir, `kaggle/${dataset.slug}/index.html`, renderKaggle(model, dataset), files);
    for (const file of dataset.files) {
      const name = encodeURIComponent(file.path.split("/").pop());
      await write(outDir, `downloads/${dataset.slug}/${name}.txt`, `${MOCK_NOTICE}\n\nMock download for ${dataset.title}: ${file.path}\n`, files);
    }
  }
  return { outDir, files };
}
