import { copyFile, mkdir, rm, writeFile } from "node:fs/promises";
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
      primarySlug: slugify(datasets[0]?.slug || datasets[0]?.title || "dataset"),
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
  <header class="topbar hf-topbar">
    <a class="brand" href="/"><span class="brand-mark">😏</span><span>ShmuggingFace</span></a>
    <label class="global-search"><span>⌕</span><input aria-label="Search" placeholder="Search models, datasets, users..." /></label>
    <nav class="global-nav">
      <a href="/hf/${site.primarySlug || ""}/">Models</a>
      <a href="/hf/${site.primarySlug || ""}/">Datasets</a>
      <a href="/hf/${site.primarySlug || ""}/">Spaces</a>
      <a href="/hf/${site.primarySlug || ""}/">Buckets <strong>NEW</strong></a>
      <a href="/manifest.json">Docs</a>
      <a href="/manifest.json">Pricing</a>
      ${nav}
      <a class="avatar" href="/manifest.json">😏</a>
    </nav>
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
    .map((file) => {
      const href = file.downloadUrl || `/downloads/${dataset.slug}/${file.path.split("/").map(encodeURIComponent).join("/")}`;
      const label = file.downloadLabel || (file.downloadUrl ? `Open ${file.storage || "storage"}` : "Download");
      const download = file.downloadUrl ? "" : " download";
      return `<li><span>${escapeHtml(file.path)}</span><strong>${escapeHtml(file.size || "")}</strong><em>${escapeHtml(file.kind || "file")}</em><a href="${escapeHtml(href)}"${download}>${escapeHtml(label)}</a></li>`;
    })
    .join("");
}

function renderHf(model, dataset) {
  const rowCount = Math.max(dataset.rows.length, 1);
  const firstColumn = escapeHtml(dataset.columns[0] || "text");
  const modality = dataset.task.includes("image") ? "Image" : dataset.task.includes("text") ? "Text" : "Tabular";
  const metadata = [
    ["Tasks:", dataset.task],
    ["Modalities:", modality],
    ["Formats:", dataset.files[0]?.kind || "CSV"],
    ["Sub-tasks:", dataset.task.replaceAll("-", " ")],
    ["Languages:", dataset.language],
    ["Size:", rowCount < 1000 ? "< 1K" : "1K - 10K"],
    ["Libraries:", "Datasets"],
    ["License:", dataset.license],
  ];
  const body = `<section class="hf-repo-hero">
    <div class="hf-title-row">
      <h1><span class="hf-muted-icon">▣</span><span>Datasets:</span> <a>${escapeHtml(dataset.owner)}</a>/<strong>${escapeHtml(dataset.slug)}</strong><button class="copy-button">□</button></h1>
      <button class="small-button">♡ like</button><span class="count-pill">${escapeHtml(dataset.likes)}</span>
      <button class="small-button">Follow ${escapeHtml(dataset.owner)}</button>
    </div>
    <div class="hf-meta-grid">
      ${metadata.map(([label, value]) => `<div class="meta-line"><span>${escapeHtml(label)}</span><a>${escapeHtml(value)}</a></div>`).join("")}
      ${dataset.tags.map((tag) => `<div class="meta-line"><span>Tag:</span><a>${escapeHtml(tag)}</a></div>`).join("")}
    </div>
  </section>
  <nav class="hf-tabs">
    <a class="active" href="#dataset-card">▣ Dataset card</a>
    <a href="#data-studio">▦ Data Studio</a>
    <a href="#files-and-versions">☷ Files and versions <span>xet</span></a>
    <a href="#community">🤗 Community <strong>${escapeHtml(dataset.discussions.length)}</strong></a>
    <a href="#settings">⚙ Settings</a>
  </nav>
  <section class="hf-main-grid">
    <article class="hf-content">
      <section class="dataset-viewer" id="data-studio">
        <header>
          <h2>▦ Dataset Viewer</h2>
          <div class="viewer-actions"><a>↻ Auto-converted to Parquet</a><button>&lt;/&gt; API</button><button>Embed</button><button>Duplicate</button><button>Data Studio</button></div>
        </header>
        <div class="viewer-splits">
          <button><span>Subset (${dataset.files.length})</span><strong>${escapeHtml(dataset.slug)} · ${rowCount} rows</strong><em>⌄</em></button>
          <button><span>Split (3)</span><strong>train · ${rowCount} rows</strong><em>⌄</em></button>
        </div>
        <label class="viewer-search"><span>⌕</span><input placeholder="Search this dataset"></label>
        <div class="viewer-column-profile">
          <strong>${firstColumn}</strong>
          <span>string · lengths</span>
          <div class="mini-histogram"><i style="height:38px"></i><i style="height:8px"></i><i style="height:4px"></i><i style="height:3px"></i><i style="height:2px"></i></div>
          <small>0 <b>7.07k</b></small>
        </div>
        <div class="hf-row-preview">
          ${dataset.rows.slice(0, 7).map((row, index) => `<div class="preview-row ${index === 0 ? "preview-heading" : ""}">${dataset.columns.map((column) => escapeHtml(row[column])).join(" · ")}</div>`).join("")}
        </div>
        <footer class="viewer-pagination"><span>‹ Previous</span><strong>1</strong><span>2</span><span>3</span><span>...</span><span>Next ›</span></footer>
      </section>
      <section class="hf-card-markdown" id="dataset-card">
        <h2>Dataset Card for "${escapeHtml(dataset.title)}"</h2>
        <p>${escapeHtml(dataset.description)}</p>
        <h3>Mock release notes</h3>
        <p>${escapeHtml(dataset.subtitle)}</p>
      </section>
      <section class="hf-card-markdown" id="settings">
        <h2>Settings</h2>
        <p>This mock settings tab is intentionally read-only. It exists so reviewers can verify the expected Hugging Face navigation target without changing a real release.</p>
      </section>
    </article>
    <aside class="hf-sidebar">
      <div class="sidebar-actions"><button class="primary-action">&lt;/&gt; Use this dataset</button><button>Edit dataset card</button><button>⋮</button></div>
      <div class="downloads-row"><span>Downloads last month</span><strong>${escapeHtml(dataset.downloads)}</strong></div>
      <dl class="hf-info-grid">
        <div><dt>Homepage:</dt><dd>shmuggingface.local</dd></div>
        <div><dt>Paper:</dt><dd>Mock release review</dd></div>
        <div><dt>Point of Contact:</dt><dd>${escapeHtml(model.site.owner)}</dd></div>
        <div><dt>Size of downloaded dataset files:</dt><dd>${escapeHtml(dataset.files[0]?.size || "n/a")}</dd></div>
        <div><dt>Number of rows:</dt><dd>${rowCount}</dd></div>
        <div><dt>Total file size:</dt><dd>${escapeHtml(dataset.files.map((file) => file.size).filter(Boolean).join(" + ") || "n/a")}</dd></div>
      </dl>
      <section class="hf-side-section" id="files-and-versions">
        <h3>Files and versions</h3>
        <ul class="hf-files">${files(dataset)}</ul>
      </section>
      <section class="hf-side-section" id="community">
        <h3>Community</h3>
        <ul class="hf-model-list">${dataset.discussions.map((item) => `<li><strong>${escapeHtml(item)}</strong><span>mock discussion · updated today</span></li>`).join("")}</ul>
      </section>
    </aside>
  </section>`;
  return layout({ title: `${dataset.title} | ShmuggingFace`, body, site: model.site });
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

function hfSpecificStyles() {
  return `
body{background:#fff;color:#111827}.mock-ribbon{background:#111827;color:#fff;padding:7px 16px;font-size:14px;font-weight:700}.hf-topbar{position:sticky;top:0;height:56px;padding:0 6%;gap:14px;justify-content:flex-start;flex-wrap:nowrap;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 4px rgba(15,23,42,.05)}.brand{font-size:20px;color:#111827;white-space:nowrap}.brand-mark{font-size:28px}.global-search{width:min(420px,32vw);height:40px;border:1px solid #d8dee8;border-radius:9px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#9aa3b2;background:#fff}.global-search input{border:0;outline:0;width:100%;font:inherit;font-size:15px;color:#111827}.global-search input::placeholder{color:#8b95a5}.global-nav{margin-left:auto;gap:14px;flex-wrap:nowrap}.global-nav a{font-weight:650;color:#111827;font-size:14px;white-space:nowrap}.global-nav strong{font-size:10px;color:#2563eb;background:#dbeafe;border-radius:4px;padding:2px 4px}.global-nav .avatar{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;border:1px solid #d8dee8;padding:0;flex:0 0 auto}main{max-width:none;padding:0}.hf-repo-hero{padding:54px 6% 34px;background:#fff;border-bottom:1px solid #eef0f4}.hf-title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.hf-title-row h1{margin:0 12px 0 0;font-size:26px;line-height:1.25;font-weight:750;letter-spacing:0;display:flex;align-items:center;gap:8px}.hf-title-row h1 span{color:#98a1b2;font-weight:750}.hf-title-row h1 a{color:#374151;text-decoration:none;font-weight:450}.hf-title-row h1 strong{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:27px}.hf-muted-icon{font-size:17px;color:#c6ccd7}.copy-button{border:0;background:transparent;color:#6b7280;font-size:16px}.small-button,.count-pill{border:1px solid #d8dee8;background:#fff;border-radius:7px;padding:7px 10px;font:inherit;font-size:14px;color:#536073}.count-pill{background:#f8fafc}.hf-meta-grid{display:flex;gap:14px 20px;flex-wrap:wrap;margin-top:18px;max-width:1420px}.meta-line{display:flex;align-items:center;gap:8px;color:#98a1b2}.meta-line span{font-size:14px}.meta-line a{display:inline-flex;align-items:center;min-height:34px;padding:6px 12px;border:1px solid #e3e7ee;border-radius:9px;background:#fff;color:#374151;text-decoration:none;box-shadow:0 4px 12px rgba(15,23,42,.04);font-size:14px}.hf-tabs{height:58px;padding:0 6%;display:flex;align-items:end;gap:22px;border-bottom:1px solid #e5e7eb;background:#fff;overflow:auto}.hf-tabs a{height:100%;display:flex;align-items:center;gap:7px;color:#4b5563;text-decoration:none;font-size:17px;font-weight:520;white-space:nowrap;border-bottom:3px solid transparent}.hf-tabs a.active{color:#111827;font-weight:760;border-bottom-color:#111827}.hf-tabs span{font-size:11px;border:1px solid #e5e7eb;border-radius:7px;padding:1px 5px;color:#4f46e5}.hf-tabs strong{font-size:12px;color:#fff;background:#111827;border-radius:6px;padding:1px 5px}.hf-main-grid{display:grid;grid-template-columns:minmax(0,1fr) 530px;gap:0;max-width:1800px;margin:0 auto}.hf-content{border:0;border-radius:0;padding:32px 32px 56px 6%;background:#fff}.hf-sidebar{border:0;border-left:1px solid #e5e7eb;border-radius:0;padding:32px 6% 56px 32px;background:#fff}.dataset-viewer{border:1px solid #d8dee8;border-radius:10px;box-shadow:0 2px 8px rgba(15,23,42,.06);overflow:hidden;background:#fff}.dataset-viewer header{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid #e5e7eb;gap:12px}.dataset-viewer h2{margin:0;font-size:18px;white-space:nowrap}.viewer-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.viewer-actions a{color:#8b95a5;font-size:13px}.viewer-actions button,.sidebar-actions button{border:1px solid #d8dee8;background:#f8fafc;border-radius:7px;padding:7px 10px;font:inherit;font-size:13px;color:#374151}.viewer-splits{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e5e7eb}.viewer-splits button{min-height:72px;border:0;border-right:1px solid #e5e7eb;background:#fff;text-align:left;padding:12px 16px;display:grid;grid-template-columns:1fr auto;gap:4px 10px;font:inherit}.viewer-splits button:last-child{border-right:0}.viewer-splits span{grid-column:1/-1;color:#687386;font-size:14px}.viewer-splits strong{font-size:15px}.viewer-splits em{font-style:normal;font-size:22px;align-self:center}.viewer-search{height:48px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;padding:0 16px;color:#98a1b2}.viewer-search input{border:0;outline:0;width:100%;font:inherit;font-size:16px}.viewer-column-profile{padding:14px 16px;border-bottom:1px solid #e5e7eb;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.viewer-column-profile strong{display:block;font-size:15px}.viewer-column-profile span{color:#7b8494;font-size:14px;font-style:italic}.mini-histogram{height:42px;display:flex;align-items:end;gap:4px;margin-top:8px}.mini-histogram i{display:block;width:14px;background:#98a1b2;border-radius:2px 2px 0 0}.viewer-column-profile small{display:flex;width:176px;justify-content:space-between;color:#8b95a5}.hf-row-preview{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:15px;color:#1f2937}.preview-row{padding:14px 16px;border-bottom:1px solid #e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.preview-heading{background:#fbfcfe}.viewer-pagination{height:50px;display:flex;align-items:center;justify-content:center;gap:24px;color:#6b7280;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;border-top:1px solid #e5e7eb}.viewer-pagination strong{border:1px solid #d8dee8;border-radius:10px;padding:6px 12px;color:#111827}.hf-card-markdown{margin-top:54px}.hf-card-markdown h2{font-size:24px;color:#263244}.hf-card-markdown p{font-size:16px;line-height:1.6;color:#374151}.sidebar-actions{display:flex;gap:10px;border-bottom:1px solid #eef0f4;padding-bottom:26px}.sidebar-actions .primary-action{background:#030712;color:#fff;border-color:#030712;min-width:210px;font-weight:700}.downloads-row{height:88px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;justify-content:space-between;gap:20px}.downloads-row span{color:#667085;font-size:15px}.downloads-row span:after{content:"";display:inline-block;width:150px;border-bottom:1px dotted #d8dee8;margin-left:16px;vertical-align:middle}.downloads-row strong{font-size:19px}.hf-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;border-bottom:1px solid #eef0f4;padding:26px 0 28px}.hf-info-grid div{border:1px solid #e5e7eb;border-radius:9px;padding:10px 12px}.hf-info-grid dt{font-size:13px;color:#98a1b2;font-weight:650}.hf-info-grid dd{font-size:14px;color:#111827;margin-top:4px}.hf-side-section{border-bottom:1px solid #eef0f4;padding:24px 0}.hf-side-section h3{font-size:18px;margin:0 0 14px;color:#1f2937}.hf-files{list-style:none;margin:0;padding:0;display:grid;gap:10px}.hf-files li{border:1px solid #e5e7eb;border-radius:10px;padding:11px 12px;display:grid;grid-template-columns:1fr auto;gap:5px 10px}.hf-files span{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700}.hf-files strong,.hf-files em,.hf-files a{font-size:13px;color:#8b95a5}.hf-model-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}.hf-model-list li{border:1px solid #e5e7eb;border-radius:10px;padding:12px;box-shadow:0 1px 4px rgba(15,23,42,.04)}.hf-model-list strong{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hf-model-list span{display:block;color:#98a1b2;font-size:13px;margin-top:5px}
@media(max-width:1100px){.hf-topbar{padding:10px 20px;height:auto;flex-wrap:wrap}.global-search{order:3;width:100%}.global-nav{margin-left:0}.hf-repo-hero,.hf-tabs{padding-left:24px;padding-right:24px}.hf-main-grid{grid-template-columns:1fr}.hf-content,.hf-sidebar{padding:24px}.hf-sidebar{border-left:0;border-top:1px solid #e5e7eb}.dataset-viewer header{height:auto;align-items:flex-start;flex-direction:column;padding:14px 16px}.viewer-splits{grid-template-columns:1fr}.viewer-splits button{border-right:0;border-bottom:1px solid #e5e7eb}.hf-info-grid{grid-template-columns:1fr}}`;
}

async function write(outDir, path, contents, files) {
  const target = join(outDir, path);
  await mkdir(resolve(target, ".."), { recursive: true });
  await writeFile(target, contents);
  files.push(path);
}

async function copyDownload(outDir, dataset, file, options, files) {
  if (file.downloadUrl) {
    return;
  }
  if (!file.sourcePath) {
    throw new Error(`File ${dataset.slug}:${file.path} must define sourcePath or downloadUrl`);
  }
  const source = resolve(options.configDir || process.cwd(), file.sourcePath);
  const targetPath = `downloads/${dataset.slug}/${file.path}`;
  const target = join(outDir, targetPath);
  await mkdir(resolve(target, ".."), { recursive: true });
  await copyFile(source, target);
  files.push(targetPath);
}

export async function generateSite(config, options = {}) {
  const model = normalizeConfig(config);
  const outDir = resolve(options.outDir || "dist");
  const files = [];
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  await write(outDir, "index.html", renderHome(model), files);
  await write(outDir, "assets/styles.css", styles() + hfSpecificStyles(), files);
  await write(outDir, "manifest.json", JSON.stringify({ ...model, mockNotice: MOCK_NOTICE }, null, 2), files);
  for (const dataset of model.datasets) {
    await write(outDir, `hf/${dataset.slug}/index.html`, renderHf(model, dataset), files);
    await write(outDir, `kaggle/${dataset.slug}/index.html`, renderKaggle(model, dataset), files);
    for (const file of dataset.files) {
      await copyDownload(outDir, dataset, file, options, files);
    }
  }
  return { outDir, files };
}
