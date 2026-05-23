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

function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
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
        contactName: dataset.contactName || site.contactName || site.owner || "Dataset reviewer",
        contactEmail: dataset.contactEmail || site.contactEmail || "",
        rowCount: Number.isFinite(Number(dataset.rowCount)) ? Number(dataset.rowCount) : (dataset.rows || []).length,
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

function kaggleLayout({ title, body }) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ctext y='50' font-size='50'%3ES%3C/text%3E%3C/svg%3E">
  <link rel="stylesheet" href="/assets/styles.css">
</head>
<body class="kg-body">
  <div class="mock-ribbon">${escapeHtml(MOCK_NOTICE)}</div>
  ${body}
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

function kaggleDataExplorer(dataset, rowCount) {
  const file = dataset.files.find((item) => item.path.endsWith(".csv")) || dataset.files[0] || { path: `${dataset.slug}.csv`, size: "" };
  const columns = dataset.columns.slice(0, 10);
  const visibleCount = Math.min(columns.length, 10);
  const rows = dataset.rows.slice(0, 8);
  const columnIcon = (column) => /url|link|id|name|status|pattern|color|fabric|split/i.test(column) ? "A" : "123";
  const summaryFor = (column, index) => {
    const values = rows.map((row) => row[column]).filter((value) => value !== undefined && value !== "");
    const unique = new Set(values).size || Math.max(1, rowCount - index * 31);
    if (/probability|score|temperature|rpm|funding|total|amount|size|count/i.test(column)) {
      return `<strong>${escapeHtml(formatNumber(Math.max(unique, Math.min(rowCount, unique * 17))))}</strong><span>unique values</span>`;
    }
    const primary = values[0] ?? "mock";
    const secondary = values[1] ?? "other";
    return `<dl><dt>${escapeHtml(primary)}</dt><dd>${Math.max(6, 19 - index)}%</dd><dt>${escapeHtml(secondary)}</dt><dd>${Math.max(2, 9 - index)}%</dd><dt>Other (${escapeHtml(formatNumber(Math.max(rowCount - 1184 - index * 283, 1)))})</dt><dd>${Math.min(94, 78 + index)}%</dd></dl>`;
  };
  const headerCells = columns.map((column, index) => `<th>
    <div class="kg-de-col-title"><span>${escapeHtml(columnIcon(column))}</span><strong>${escapeHtml(column)}</strong><button type="button" aria-label="Filter ${escapeHtml(column)}">≡</button></div>
    <em>${escapeHtml(index === 0 ? "Link to Organization" : column.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()))}</em>
  </th>`).join("");
  const profileCells = columns.map((column, index) => `<td>${summaryFor(column, index)}</td>`).join("");
  const bodyRows = rows.map((row) => `<tr>${columns.map((column) => `<td>${escapeHtml(row[column] ?? "-")}</td>`).join("")}</tr>`).join("");
  return `<section class="kg-data-explorer" data-kg-explorer>
    <div class="kg-de-main">
      <header class="kg-de-header">
        <h3>${escapeHtml(file.path.split("/").pop() || file.path)} <span>(${escapeHtml(file.size || "mock size")})</span></h3>
        <div class="kg-de-actions">
          <a href="${escapeHtml(fileHref(dataset, file))}"${file.downloadUrl ? "" : " download"} aria-label="Download ${escapeHtml(file.path)}">⇩</a>
          <button type="button" data-kg-explorer-fullscreen aria-label="Fullscreen">⛶</button>
          <button type="button" data-kg-explorer-collapse aria-label="Collapse summary">›</button>
        </div>
      </header>
      <div class="kg-de-toolbar">
        <div class="kg-de-modes" role="tablist" aria-label="Explorer view modes">
          <button type="button" class="active" data-kg-mode="detail">Detail</button>
          <button type="button" data-kg-mode="compact">Compact</button>
          <button type="button" data-kg-mode="column">Column</button>
        </div>
        <button type="button" class="kg-de-column-count" data-kg-column-menu>${escapeHtml(String(visibleCount))} of ${escapeHtml(String(dataset.columns.length || visibleCount))} columns⌄</button>
        <div class="kg-de-column-menu" data-kg-column-popover hidden>
          ${dataset.columns.map((column, index) => `<label><input type="checkbox" ${index < visibleCount ? "checked" : ""} disabled> ${escapeHtml(column)}</label>`).join("")}
        </div>
      </div>
      <div class="kg-de-table-wrap">
        <table class="kg-de-table">
          <thead><tr>${headerCells}</tr></thead>
          <tbody class="kg-de-profile"><tr>${profileCells}</tr></tbody>
          <tbody>${bodyRows}</tbody>
        </table>
      </div>
    </div>
    <aside class="kg-de-side" data-kg-explorer-side>
      <h3>Data Explorer</h3>
      <a href="${escapeHtml(fileHref(dataset, file))}"${file.downloadUrl ? "" : " download"}>Version 1 <span>(${escapeHtml(file.size || "mock size")})</span></a>
      <div class="kg-de-file"><span>▥</span>${escapeHtml(file.path.split("/").pop() || file.path)}</div>
      <section>
        <h4>Summary</h4>
        <p><span>▸</span><strong>1 file</strong></p>
        <p><span>▸</span><strong>${escapeHtml(String(dataset.columns.length || visibleCount))} columns</strong></p>
        <p><span>▸</span><strong>${escapeHtml(formatNumber(rowCount))} rows</strong></p>
      </section>
    </aside>
  </section>
  <script>
    (() => {
      const explorer = document.querySelector("[data-kg-explorer]");
      if (!explorer) return;
      const setMode = (mode) => {
        explorer.dataset.mode = mode;
        explorer.querySelectorAll("[data-kg-mode]").forEach((button) => button.classList.toggle("active", button.dataset.kgMode === mode));
      };
      explorer.querySelectorAll("[data-kg-mode]").forEach((button) => button.addEventListener("click", () => setMode(button.dataset.kgMode)));
      explorer.querySelector("[data-kg-column-menu]")?.addEventListener("click", () => {
        const popover = explorer.querySelector("[data-kg-column-popover]");
        popover?.toggleAttribute("hidden");
      });
      explorer.querySelector("[data-kg-explorer-collapse]")?.addEventListener("click", () => explorer.classList.toggle("summary-collapsed"));
      explorer.querySelector("[data-kg-explorer-fullscreen]")?.addEventListener("click", () => explorer.classList.toggle("fullscreen"));
    })();
  </script>`;
}

function files(dataset) {
  return dataset.files
    .map((file) => {
      const href = fileHref(dataset, file);
      const label = file.downloadLabel || (file.downloadUrl ? `Open ${file.storage || "storage"}` : "Download");
      const download = file.downloadUrl ? "" : " download";
      return `<li><span>${escapeHtml(file.path)}</span><strong>${escapeHtml(file.size || "")}</strong><em>${escapeHtml(file.kind || "file")}</em><a href="${escapeHtml(href)}"${download}>${escapeHtml(label)}</a></li>`;
    })
    .join("");
}

function fileHref(dataset, file) {
  return file.downloadUrl || `/downloads/${dataset.slug}/${file.path.split("/").map(encodeURIComponent).join("/")}`;
}

function renderHfRepoHero(dataset) {
  const rowCount = Math.max(dataset.rowCount, dataset.rows.length, 1);
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
  return `<section class="hf-repo-hero">
    <div class="hf-title-row">
      <h1><span class="hf-muted-icon">▣</span><span>Datasets:</span> <a>${escapeHtml(dataset.owner)}</a>/<strong>${escapeHtml(dataset.slug)}</strong><button class="copy-button">□</button></h1>
      <button class="small-button">♡ like</button><span class="count-pill">${escapeHtml(dataset.likes)}</span>
      <button class="small-button">Follow ${escapeHtml(dataset.owner)}</button>
    </div>
    <div class="hf-meta-grid">
      ${metadata.map(([label, value]) => `<div class="meta-line"><span>${escapeHtml(label)}</span><a>${escapeHtml(value)}</a></div>`).join("")}
      ${dataset.tags.map((tag) => `<div class="meta-line"><span>Tag:</span><a>${escapeHtml(tag)}</a></div>`).join("")}
    </div>
  </section>`;
}

function viewerRows(dataset) {
  return dataset.rows
    .slice(0, 7)
    .map((row, index) => {
      const text = dataset.columns.map((column) => escapeHtml(row[column])).join(" · ");
      const page = (index % 3) + 1;
      return `<div class="preview-row ${index === 0 ? "preview-heading" : ""}" data-page="${page}" data-row-text="${escapeHtml(text.toLowerCase())}">${text}</div>`;
    })
    .join("");
}

function viewerScript(dataset) {
  const slug = escapeHtml(dataset.slug);
  return `<script>
(() => {
  const viewer = document.querySelector('[data-viewer="${slug}"]');
  if (!viewer) return;
  const status = viewer.querySelector('[data-viewer-status]');
  const rows = [...viewer.querySelectorAll('[data-row-text]')];
  const searchInput = viewer.querySelector('[data-viewer-search]');
  const setStatus = (message) => {
    if (status) status.textContent = message;
  };
  const currentQuery = () => searchInput?.value.trim().toLowerCase() || '';
  const applyVisibility = () => {
    const page = viewer.dataset.page || '1';
    const query = currentQuery();
    let shown = 0;
    rows.forEach((row) => {
      const visible = row.dataset.page === page && (!query || row.dataset.rowText.includes(query));
      row.hidden = !visible;
      if (visible) shown += 1;
    });
    setStatus(query ? shown + ' rows match "' + query + '" on page ' + page + '.' : 'Showing preview page ' + page + ' for ${slug}.');
  };
  const setPage = (page) => {
    const normalized = Math.max(1, Math.min(3, Number(page) || 1));
    viewer.dataset.page = String(normalized);
    viewer.querySelectorAll('[data-page-button]').forEach((button) => {
      button.classList.toggle('active', button.dataset.pageButton === String(normalized));
      button.setAttribute('aria-current', button.dataset.pageButton === String(normalized) ? 'page' : 'false');
    });
    applyVisibility();
  };
  setPage(1);
  viewer.querySelector('[data-action="api"]')?.addEventListener('click', () => {
    viewer.querySelector('[data-api-panel]')?.toggleAttribute('hidden');
    setStatus('API command panel toggled.');
  });
  viewer.querySelector('[data-action="embed"]')?.addEventListener('click', () => {
    viewer.querySelector('[data-embed-panel]')?.toggleAttribute('hidden');
    setStatus('Embed snippet panel toggled.');
  });
  viewer.querySelector('[data-action="duplicate"]')?.addEventListener('click', () => {
    const button = viewer.querySelector('[data-action="duplicate"]');
    if (button) button.textContent = 'Duplicated';
    setStatus('Mock duplicate created for review.');
  });
  viewer.querySelector('[data-action="studio"]')?.addEventListener('click', () => {
    location.href = '/hf/${slug}/data-studio/';
    setStatus('Data Studio view selected.');
  });
  viewer.querySelector('[data-action="parquet"]')?.addEventListener('click', (event) => {
    event.preventDefault();
    viewer.querySelector('[data-parquet-panel]')?.toggleAttribute('hidden');
    setStatus('Parquet conversion details toggled.');
  });
  viewer.querySelectorAll('[data-menu-button]').forEach((button) => {
    button.addEventListener('click', () => {
      const menu = viewer.querySelector('[data-menu="' + button.dataset.menuButton + '"]');
      const expanded = button.getAttribute('aria-expanded') === 'true';
      button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      menu?.toggleAttribute('hidden', expanded);
      setStatus((expanded ? 'Closed ' : 'Opened ') + button.dataset.menuButton + ' menu.');
    });
  });
  viewer.querySelectorAll('[data-menu] button').forEach((option) => {
    option.addEventListener('click', () => {
      const menu = option.closest('[data-menu]');
      const menuName = menu?.dataset.menu || 'viewer';
      const trigger = viewer.querySelector('[data-menu-button="' + menuName + '"]');
      menu?.setAttribute('hidden', '');
      trigger?.setAttribute('aria-expanded', 'false');
      setStatus(option.textContent.trim() + ' selected from ' + menuName + ' menu.');
    });
  });
  searchInput?.addEventListener('input', () => {
    setPage(1);
    applyVisibility();
  });
  viewer.querySelectorAll('[data-page-button]').forEach((button) => {
    button.addEventListener('click', () => setPage(button.dataset.pageButton));
  });
  viewer.querySelector('[data-page-prev]')?.addEventListener('click', () => setPage((Number(viewer.dataset.page) || 1) - 1));
  viewer.querySelector('[data-page-next]')?.addEventListener('click', () => setPage((Number(viewer.dataset.page) || 1) + 1));
})();
</script>`;
}

function hfTabs(dataset, active = "card") {
  const base = `/hf/${dataset.slug}/`;
  const tab = (id, href, label) => `<a class="${active === id ? "active" : ""}" href="${href}">${label}</a>`;
  return `<nav class="hf-tabs">
    ${tab("card", `${base}#dataset-card`, "▣ Dataset card")}
    ${tab("studio", `${base}data-studio/`, "▦ Data Studio")}
    ${tab("files", `${base}files-and-versions/`, "☷ Files and versions <span>xet</span>")}
    ${tab("community", `${base}community/`, `🤗 Community <strong>${escapeHtml(dataset.discussions.length)}</strong>`)}
  </nav>`;
}

function viewerShell(dataset, { studio = false } = {}) {
  const rowCount = Math.max(dataset.rowCount, dataset.rows.length, 1);
  const firstColumn = escapeHtml(dataset.columns[0] || "text");
  return `<section class="dataset-viewer ${studio ? "studio-dataset-viewer" : ""}" id="data-studio" data-viewer="${escapeHtml(dataset.slug)}">
    <header>
      <h2>▦ Dataset Viewer</h2>
      ${studio ? '<div class="studio-panel-actions"><button type="button">▯</button><button type="button">⋮</button></div>' : '<div class="viewer-actions"><a href="#parquet-details" data-action="parquet">↻ Auto-converted to Parquet</a><button type="button" data-action="api">&lt;/&gt; API</button><button type="button" data-action="embed">Embed</button><button type="button" data-action="duplicate">Duplicate</button><button type="button" data-action="studio">Data Studio</button></div>'}
    </header>
    <div class="viewer-splits">
      <button type="button" data-menu-button="subset" aria-expanded="false"><span>Subset (${dataset.files.length})</span><strong>${escapeHtml(dataset.slug)} · ${formatNumber(rowCount)} rows</strong><em>⌄</em></button>
      <button type="button" data-menu-button="split" aria-expanded="false"><span>Split (3)</span><strong>train · ${formatNumber(rowCount)} rows</strong><em>⌄</em></button>
    </div>
    <div class="viewer-menu-row">
      <div class="viewer-menu" data-menu="subset" hidden><button type="button">${escapeHtml(dataset.slug)}</button><button type="button">default</button><button type="button">review-sample</button></div>
      <div class="viewer-menu" data-menu="split" hidden><button type="button">train</button><button type="button">validation</button><button type="button">test</button></div>
    </div>
    <label class="viewer-search"><span>⌕</span><input data-viewer-search placeholder="Search this dataset"></label>
    ${studio ? "" : `<div class="viewer-panels">
      <div class="viewer-panel" id="parquet-details" data-parquet-panel hidden>Auto-converted preview files are shown as Parquet-style review rows. Original files remain available in Files and versions.</div>
      <div class="viewer-panel" data-api-panel hidden><code>from datasets import load_dataset<br>dataset = load_dataset("${escapeHtml(dataset.owner)}/${escapeHtml(dataset.slug)}")</code></div>
      <div class="viewer-panel" data-embed-panel hidden><code>&lt;iframe src="/hf/${escapeHtml(dataset.slug)}/#data-studio"&gt;&lt;/iframe&gt;</code></div>
    </div>`}
    <div class="viewer-column-profile">
      <strong>${firstColumn}</strong>
      <span>string · lengths</span>
      <div class="mini-histogram"><i style="height:38px"></i><i style="height:8px"></i><i style="height:4px"></i><i style="height:3px"></i><i style="height:2px"></i></div>
      <small>0 <b>7.07k</b></small>
    </div>
    <div class="hf-row-preview">
      ${viewerRows(dataset)}
    </div>
    <footer class="viewer-pagination"><button type="button" data-page-prev>‹ Previous</button><button type="button" data-page-button="1" class="active" aria-current="page">1</button><button type="button" data-page-button="2">2</button><button type="button" data-page-button="3">3</button><span>...</span><button type="button" data-page-next>Next ›</button></footer>
    <p class="viewer-status" data-viewer-status aria-live="polite">Showing preview page 1 for ${escapeHtml(dataset.slug)}.</p>
  </section>`;
}

function renderHfCompactHeader(dataset, active = "studio") {
  return `<section class="hf-compact-header">
    <div class="hf-title-row">
      <h1><span class="hf-muted-icon">▣</span><span>Datasets:</span> <a>${escapeHtml(dataset.owner)}</a>/<strong>${escapeHtml(dataset.slug)}</strong><button class="copy-button">□</button></h1>
      <button class="small-button">♡ like</button><span class="count-pill">${escapeHtml(dataset.likes)}</span>
      <button class="small-button">Follow ${escapeHtml(dataset.owner)}</button>
    </div>
    ${hfTabs(dataset, active)}
  </section>`;
}

function renderFileBrowser(dataset) {
  const totalSize = dataset.files.map((file) => file.size).filter(Boolean).join(" + ") || "n/a";
  const folders = [...new Set(dataset.files.map((file) => file.path.split("/")[0]).filter((part, _, parts) => part && dataset.files.some((file) => file.path.startsWith(`${part}/`))))];
  const folderRows = folders.map((folder) => {
    const count = dataset.files.filter((file) => file.path.startsWith(`${folder}/`)).length;
    return `<div class="repo-file-row folder-row"><span class="file-name">📁 ${escapeHtml(folder)}</span><span class="file-message">Prepare ${escapeHtml(folder)} release files</span><span class="file-age">review mock</span><span></span></div>`;
  }).join("");
  const fileRows = dataset.files.map((file, index) => {
    const href = fileHref(dataset, file);
    const external = file.downloadUrl ? ` data-storage="${escapeHtml(file.storage || "external")}"` : " download";
    const message = index === 0 ? "Convert dataset to Parquet (#8)" : file.downloadUrl ? `Point large artifact at ${file.storage || "external storage"}` : "Update files from the dataset builder";
    const safe = file.downloadUrl ? `<span class="safe-pill">${escapeHtml(file.storage || "external")}</span>` : '<span class="safe-pill">Safe</span>';
    return `<div class="repo-file-row">
      <span class="file-name">📄 ${escapeHtml(file.path)} ${safe}</span>
      <span class="file-size">${escapeHtml(file.size || "")}</span>
      <a class="file-download" href="${escapeHtml(href)}"${external}>⇩</a>
      <span class="file-message">${escapeHtml(message)}</span>
      <span class="file-age">${escapeHtml(index === 0 ? "today" : dataset.updated)}</span>
    </div>`;
  }).join("");
  return `<section class="hf-files-page" data-files-page="${escapeHtml(dataset.slug)}">
    <div class="file-browser-toolbar">
      <button type="button" data-files-menu-button="branch">⑂ main⌄</button>
      <strong class="file-repo-name">${escapeHtml(dataset.slug)}</strong>
      <span class="repo-size">${escapeHtml(totalSize)}</span>
      <div class="contributors"><span>🧑🏽‍💻</span><span>🧑🏻‍🔬</span><span>🧑🏾‍💼</span><strong>${Math.max(3, dataset.discussions.length + 2)} contributors</strong></div>
      <button type="button" data-files-menu-button="history">◷ History: ${Math.max(8, dataset.files.length * 4)} commits</button>
      <button type="button" data-files-menu-button="contribute">＋ Contribute⌄</button>
    </div>
    <div class="files-menu-row">
      <div class="files-popover" data-files-menu="branch" hidden><button type="button">main</button><button type="button">review-draft</button><button type="button">parquet-preview</button></div>
      <div class="files-popover history-popover" data-files-menu="history" hidden><strong>Recent mock commits</strong><span>Convert dataset to Parquet (#8)</span><span>Refresh README and metadata</span><span>Attach downloadable review artifacts</span></div>
      <div class="files-popover contribute-popover" data-files-menu="contribute" hidden><button type="button" disabled>Upload files</button><button type="button" disabled>Create branch</button><button type="button" disabled>Open pull request</button></div>
    </div>
    <div class="file-browser">
      <div class="commit-banner"><span>😏</span><strong>${escapeHtml(dataset.contactName)}</strong><em>HF Staff</em><code>Convert dataset to Parquet (#8)</code><kbd>b08601e</kbd><time>over 2 years ago</time></div>
      ${folderRows}
      ${fileRows}
    </div>
  </section>`;
}

function filesScript(dataset) {
  const slug = escapeHtml(dataset.slug);
  return `<script>
(() => {
  const page = document.querySelector('[data-files-page="${slug}"]');
  if (!page) return;
  const closeMenus = (current) => {
    page.querySelectorAll('[data-files-menu]').forEach((menu) => {
      if (menu !== current) menu.hidden = true;
    });
  };
  page.querySelectorAll('[data-files-menu-button]').forEach((button) => {
    button.addEventListener('click', () => {
      const menu = page.querySelector('[data-files-menu="' + button.dataset.filesMenuButton + '"]');
      if (!menu) return;
      const nextHidden = !menu.hidden;
      closeMenus(menu);
      menu.hidden = nextHidden;
    });
  });
})();
</script>`;
}

function dataStudioScript(dataset) {
  const slug = escapeHtml(dataset.slug);
  return `<script>
(() => {
  const studio = document.querySelector('[data-studio="${slug}"]');
  if (!studio) return;
  const prompt = studio.querySelector('[data-studio-prompt]');
  const empty = studio.querySelector('[data-studio-empty]');
  studio.querySelectorAll('[data-studio-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.studioTab;
      studio.querySelectorAll('[data-studio-tab]').forEach((tab) => tab.classList.toggle('active', tab.dataset.studioTab === target));
      studio.querySelectorAll('[data-studio-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.studioPanel !== target;
      });
    });
  });
  studio.querySelectorAll('[data-studio-split]').forEach((button) => {
    button.addEventListener('click', () => {
      studio.querySelectorAll('[data-studio-split]').forEach((pill) => pill.classList.toggle('active', pill === button));
      if (prompt) {
        prompt.disabled = false;
        prompt.placeholder = 'Ask about ' + button.textContent.trim();
      }
      if (empty) empty.textContent = 'Agent ready for ' + button.textContent.trim() + '.';
    });
  });
  studio.querySelector('[data-studio-send]')?.addEventListener('click', () => {
    if (empty) empty.textContent = prompt?.value ? 'Mock answer drafted for: ' + prompt.value : 'Select a subset/split or type a question to start.';
  });
})();
</script>`;
}

function datasetCodeExamples(dataset) {
  const repo = `${dataset.owner}/${dataset.slug}`;
  const firstFile = dataset.files.find((file) => !file.downloadUrl) || dataset.files[0] || { path: "data/train.csv" };
  const filePath = firstFile.path || "data/train.csv";
  const rawUrl = `https://huggingface.co/datasets/${repo}/resolve/main/${filePath}`;
  return [
    ["datasets", "Datasets", `from datasets import load_dataset\ndataset = load_dataset("${repo}")`],
    ["dask", "Dask", `import dask.dataframe as dd\ndf = dd.read_parquet("hf://datasets/${repo}/**/*.parquet")`],
    ["polars", "Polars", `import polars as pl\ndf = pl.read_csv("${rawUrl}")`],
    ["pandas", "Pandas", `import pandas as pd\ndf = pd.read_csv("${rawUrl}")`],
  ];
}

function sidebarScript(dataset) {
  const slug = escapeHtml(dataset.slug);
  return `<script>
(() => {
  const sidebar = document.querySelector('[data-sidebar="${slug}"]');
  if (!sidebar) return;
  const closeOtherPopovers = (current) => {
    sidebar.querySelectorAll('[data-sidebar-popover]').forEach((popover) => {
      if (popover !== current) popover.hidden = true;
    });
  };
  const togglePopover = (selector) => {
    const popover = sidebar.querySelector(selector);
    if (!popover) return;
    const nextHidden = !popover.hidden;
    closeOtherPopovers(popover);
    popover.hidden = nextHidden;
  };
  sidebar.querySelector('[data-sidebar-action="use"]')?.addEventListener('click', () => togglePopover('[data-use-popover]'));
  sidebar.querySelector('[data-sidebar-action="edit"]')?.addEventListener('click', () => togglePopover('[data-lock-popover]'));
  sidebar.querySelector('[data-sidebar-action="more"]')?.addEventListener('click', () => togglePopover('[data-more-popover]'));
  sidebar.querySelectorAll('[data-code-tab]').forEach((button) => {
    button.addEventListener('click', () => {
      const target = button.dataset.codeTab;
      sidebar.querySelectorAll('[data-code-tab]').forEach((tab) => {
        tab.classList.toggle('active', tab.dataset.codeTab === target);
      });
      sidebar.querySelectorAll('[data-code-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.codePanel !== target;
      });
    });
  });
})();
</script>`;
}

function communityItems(dataset) {
  const fallback = [
    "How should reviewers interpret the mock row preview?",
    "Convert dataset to Parquet",
    "Where is the download button?",
    "Document the release checklist",
  ];
  const titles = dataset.discussions.length ? dataset.discussions : fallback;
  return titles.map((title, index) => ({
    title,
    kind: index === 1 ? "pull" : "discussion",
    number: Math.max(1, titles.length + 8 - index),
    opened: index === 0 ? "6 months ago" : index === 1 ? "over 1 year ago" : index === 2 ? "about 2 years ago" : "about 3 years ago",
    author: ["maya-lintwell", "jr303", "nociza", "damc", "charles-godfrey"][index % 5],
    reactions: index % 2 === 0 ? index + 1 : 0,
    comments: index + 1,
  }));
}

function renderCommunityList(dataset) {
  return communityItems(dataset).map((item) => {
    const icon = item.kind === "pull" ? "⑂" : "▣";
    const kindClass = item.kind === "pull" ? "pull-row" : "discussion-row";
    const badge = item.reactions ? `<span class="community-badge">👍 ${item.reactions}</span>` : `<span class="community-badge">▱ ${item.comments}</span>`;
    return `<article class="community-row ${kindClass}" data-community-row data-kind="${item.kind}" data-title="${escapeHtml(item.title.toLowerCase())}">
      <div class="community-icon">${icon}</div>
      <div class="community-copy">
        <h3>${escapeHtml(item.title)}</h3>
        <p>#${escapeHtml(item.number)} opened ${escapeHtml(item.opened)} by <a>${escapeHtml(item.author)}</a></p>
      </div>
      ${badge}
    </article>`;
  }).join("");
}

function renderHfCommunity(model, dataset) {
  const body = `${renderHfRepoHero(dataset)}
  ${hfTabs(dataset, "community")}
  <section class="community-page" data-community-page="${escapeHtml(dataset.slug)}">
    <aside class="community-sidebar">
      <button type="button" data-community-action="discussion">▣ New discussion</button>
      <button type="button" data-community-action="pull">⑂ New pull request</button>
      <p data-community-status>Read-only review mock.</p>
      <h3>Resources</h3>
      <a href="/manifest.json">⌁ PR & discussions documentation</a>
      <a href="/manifest.json">⌁ Code of Conduct</a>
      <a href="/manifest.json">⌁ Hub documentation</a>
    </aside>
    <section class="community-main">
      <div class="community-controls">
        <div class="community-filter-tabs">
          <button type="button" class="active" data-community-filter="all">All</button>
          <button type="button" data-community-filter="discussion">Discussions</button>
          <button type="button" data-community-filter="pull">Pull requests</button>
        </div>
        <label class="community-search"><span>⌕</span><input data-community-search placeholder="Filter by title"></label>
        <label><input type="checkbox" data-community-watch> Watch all activity</label>
        <label><input type="checkbox" data-community-closed> View closed (${Math.max(7, dataset.discussions.length + 4)})</label>
        <button type="button" data-community-sort>↕ Sort: Recently created</button>
      </div>
      <div class="community-list">
        ${renderCommunityList(dataset)}
      </div>
      <p class="community-empty" data-community-empty hidden>No mock community items match this filter.</p>
    </section>
  </section>
  ${communityScript(dataset)}`;
  return layout({ title: `${dataset.title} Community | ShmuggingFace`, body, site: model.site });
}

function communityScript(dataset) {
  const slug = escapeHtml(dataset.slug);
  return `<script>
(() => {
  const page = document.querySelector('[data-community-page="${slug}"]');
  if (!page) return;
  const rows = [...page.querySelectorAll('[data-community-row]')];
  const empty = page.querySelector('[data-community-empty]');
  const search = page.querySelector('[data-community-search]');
  const status = page.querySelector('[data-community-status]');
  let filter = 'all';
  const apply = () => {
    const query = search?.value.trim().toLowerCase() || '';
    let shown = 0;
    rows.forEach((row) => {
      const visible = (filter === 'all' || row.dataset.kind === filter) && (!query || row.dataset.title.includes(query));
      row.hidden = !visible;
      if (visible) shown += 1;
    });
    if (empty) empty.hidden = shown !== 0;
    if (status) status.textContent = shown + ' visible mock community item' + (shown === 1 ? '.' : 's.');
  };
  page.querySelectorAll('[data-community-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      filter = button.dataset.communityFilter || 'all';
      page.querySelectorAll('[data-community-filter]').forEach((tab) => tab.classList.toggle('active', tab === button));
      apply();
    });
  });
  search?.addEventListener('input', apply);
  page.querySelector('[data-community-sort]')?.addEventListener('click', () => {
    if (status) status.textContent = 'Sort toggled in the read-only review mock.';
  });
  page.querySelectorAll('[data-community-action]').forEach((button) => {
    button.addEventListener('click', () => {
      if (status) status.textContent = button.textContent.trim() + ' is locked in this review mock.';
    });
  });
  page.querySelector('[data-community-watch]')?.addEventListener('change', () => {
    if (status) status.textContent = 'Watch preference previewed locally only.';
  });
  page.querySelector('[data-community-closed]')?.addEventListener('change', () => {
    if (status) status.textContent = 'Closed items are represented by the mock count only.';
  });
  apply();
})();
</script>`;
}

function renderHf(model, dataset) {
  const rowCount = Math.max(dataset.rowCount, dataset.rows.length, 1);
  const contact = dataset.contactEmail
    ? `<a href="mailto:${escapeHtml(dataset.contactEmail)}">${escapeHtml(dataset.contactName)}</a>`
    : escapeHtml(dataset.contactName);
  const codeExamples = datasetCodeExamples(dataset);
  const body = `${renderHfRepoHero(dataset)}
  ${hfTabs(dataset, "card")}
  <section class="hf-main-grid">
    <article class="hf-content">
      ${viewerShell(dataset)}
      ${viewerScript(dataset)}
      <section class="hf-card-markdown" id="dataset-card">
        <h2>Dataset Card for "${escapeHtml(dataset.title)}"</h2>
        <p>${escapeHtml(dataset.description)}</p>
        <h3>Mock release notes</h3>
        <p>${escapeHtml(dataset.subtitle)}</p>
      </section>
    </article>
    <aside class="hf-sidebar">
      <div class="sidebar-action-shell" data-sidebar="${escapeHtml(dataset.slug)}">
        <div class="sidebar-actions"><button class="primary-action" type="button" data-sidebar-action="use">&lt;/&gt; Use this dataset</button><button type="button" data-sidebar-action="edit">Edit dataset card</button><button type="button" data-sidebar-action="more" aria-label="More actions">⋮</button></div>
        <div class="sidebar-popover use-dataset-popover" data-sidebar-popover data-use-popover hidden>
          <strong>Use this dataset</strong>
          <div class="code-tabs">${codeExamples.map(([id, label], index) => `<button type="button" data-code-tab="${id}" class="${index === 0 ? "active" : ""}">${label}</button>`).join("")}</div>
          ${codeExamples.map(([id, label, code], index) => `<pre data-code-panel="${id}"${index === 0 ? "" : " hidden"}><code>${escapeHtml(code)}</code></pre>`).join("")}
        </div>
        <div class="sidebar-popover locked-popover" data-sidebar-popover data-lock-popover hidden>
          <strong>🔒 Dataset card locked</strong>
          <p>This is a read-only pre-release review mock. Edit the source project and regenerate the mock instead.</p>
        </div>
        <div class="sidebar-popover more-popover" data-sidebar-popover data-more-popover hidden>
          <button type="button" disabled>Report repository</button>
          <button type="button" disabled>Clone repository</button>
          <button type="button" disabled>New discussion</button>
          <button type="button" disabled>Transfer ownership</button>
        </div>
      </div>
      <div class="downloads-row"><span>Downloads last month</span><strong>${escapeHtml(dataset.downloads)}</strong></div>
      <dl class="hf-info-grid">
        <div><dt>Homepage:</dt><dd>shmuggingface.local</dd></div>
        <div><dt>Paper:</dt><dd>Mock release review</dd></div>
        <div><dt>Point of Contact:</dt><dd>${contact}</dd></div>
        <div><dt>Size of downloaded dataset files:</dt><dd>${escapeHtml(dataset.files[0]?.size || "n/a")}</dd></div>
        <div><dt>Number of rows:</dt><dd>${formatNumber(rowCount)}</dd></div>
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
  </section>
  ${sidebarScript(dataset)}`;
  return layout({ title: `${dataset.title} | ShmuggingFace`, body, site: model.site });
}

function renderHfFiles(model, dataset) {
  const body = `${renderHfRepoHero(dataset)}
  ${hfTabs(dataset, "files")}
  ${renderFileBrowser(dataset)}
  ${filesScript(dataset)}`;
  return layout({ title: `${dataset.title} Files and versions | ShmuggingFace`, body, site: model.site });
}

function renderHfDataStudio(model, dataset) {
  const rowCount = Math.max(dataset.rowCount, dataset.rows.length, 1);
  const splits = [
    [`${dataset.slug}/train`, formatNumber(rowCount)],
    [`${dataset.slug}/validation`, formatNumber(Math.max(1, Math.round(rowCount * 0.1)))],
    [`${dataset.slug}/test`, formatNumber(Math.max(1, Math.round(rowCount * 0.1)))],
    [`${dataset.slug}/review-sample`, formatNumber(Math.max(1, dataset.rows.length))],
  ];
  const body = `${renderHfCompactHeader(dataset, "studio")}
  <section class="data-studio-layout" data-studio="${escapeHtml(dataset.slug)}">
    <div class="studio-viewer-column">
      ${viewerShell(dataset, { studio: true })}
      ${viewerScript(dataset)}
    </div>
    <aside class="studio-agent-column">
      <div class="studio-agent-tabs">
        <button type="button" data-studio-tab="agent" class="active">Agent</button>
        <button type="button" data-studio-tab="sql"><span>SQL</span></button>
        <button type="button" data-studio-tab="console">Console</button>
      </div>
      <div class="studio-agent-body" data-studio-panel="agent">
        <div class="studio-agent-empty" data-studio-empty>
          <span class="studio-agent-icon">▣</span>
          <strong>Get Started</strong>
          <p>Select a subset/split to load the data and start chatting.</p>
          <div class="studio-split-pills">
            ${splits.map(([label, count]) => `<button type="button" data-studio-split>${escapeHtml(label)} · ${escapeHtml(count)}</button>`).join("")}
            <button type="button" class="more-splits" data-studio-split>+8 more⌄</button>
          </div>
        </div>
      </div>
      <div class="studio-agent-body" data-studio-panel="sql" hidden>
        <pre><code>SELECT pattern, dominant_color, AVG(pair_probability)\nFROM ${escapeHtml(dataset.slug)}\nGROUP BY 1, 2\nORDER BY 3 DESC;</code></pre>
      </div>
      <div class="studio-agent-body" data-studio-panel="console" hidden>
        <pre><code>Connected to ${escapeHtml(dataset.slug)} mock Data Studio.\nNo real queries are sent from this review mock.</code></pre>
      </div>
      <div class="studio-chatbar">
        <input data-studio-prompt disabled placeholder="Select a subset/split to get started.">
        <span>gpt-oss-120b</span>
        <button type="button" data-studio-send>↑</button>
      </div>
    </aside>
  </section>
  ${dataStudioScript(dataset)}`;
  return layout({ title: `${dataset.title} Data Studio | ShmuggingFace`, body, site: model.site });
}

function renderKaggle(model, dataset, activeTab = "data-card") {
  const rowCount = Math.max(dataset.rowCount, dataset.rows.length, 1);
  const firstFile = dataset.files.find((file) => !file.downloadUrl) || dataset.files[0];
  const downloadHref = firstFile ? fileHref(dataset, firstFile) : "/manifest.json";
  const download = firstFile?.downloadUrl ? "" : " download";
  const tags = (dataset.tags.length ? dataset.tags : [dataset.task, dataset.language, "Mock dataset"])
    .slice(0, 6)
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join("");
  const sidebarItems = model.datasets
    .slice(0, 5)
    .map((item) => `<a href="/kaggle/${item.slug}/"><span class="kg-thumb">${escapeHtml(item.title.slice(0, 1))}</span>${escapeHtml(item.title)}</a>`)
    .join("");
  const fileRows = dataset.files
    .map((file) => {
      const href = fileHref(dataset, file);
      const fileDownload = file.downloadUrl ? "" : " download";
      const label = file.downloadUrl ? `Open ${file.storage || "storage"}` : "Download";
      return `<li><span>${escapeHtml(file.path)}</span><strong>${escapeHtml(file.size || "")}</strong><a href="${escapeHtml(href)}"${fileDownload}>${escapeHtml(label)}</a></li>`;
    })
    .join("");
  const codeSnippet = `kaggle datasets download -d ${dataset.owner}/${dataset.slug}\npython - <<'PY'\nimport pandas as pd\nrows = pd.read_csv("data/train.csv")\nprint(rows.describe(include="all"))\nPY`;
  const tabContent = renderKaggleTabContent(dataset, activeTab, { rowCount, fileRows, tags, codeSnippet });
  const body = `<div class="kg-shell" data-kaggle-page="${escapeHtml(dataset.slug)}">
    <aside class="kg-sidebar">
      <div class="kg-sidebar-top"><button type="button" aria-label="Menu">☰</button><a class="kg-wordmark" href="/">shmaggle</a></div>
      <a class="kg-create" href="/manifest.json"><span>＋</span>Create</a>
      <nav class="kg-primary-nav">
        <a href="/"><span>⌖</span>Home</a>
        <a href="/manifest.json"><span>♕</span>Competitions</a>
        <a href="/manifest.json"><span>▥</span>Benchmarks</a>
        <a href="/manifest.json"><span>☷</span>Game Arena</a>
        <a href="/manifest.json"><span>&lt;&gt;</span>Data Hub</a>
        <a href="/manifest.json"><span>☰</span>More</a>
      </nav>
      <section class="kg-work">
        <h2>Your Work</h2>
        <h3>Viewed</h3>
        ${sidebarItems}
        <h3>Bookmarks</h3>
        <a href="/kaggle/${dataset.slug}/"><span class="kg-thumb">S</span>${escapeHtml(dataset.title)}</a>
      </section>
    </aside>
    <main class="kg-main">
      <header class="kg-topbar">
        <label class="kg-search"><span>⌕</span><input aria-label="Search Shmaggle" placeholder="Search"></label>
        <a class="kg-avatar" href="/manifest.json">😏</a>
      </header>
      <section class="kg-hero">
        <div class="kg-dataset-copy">
          <p class="kg-author"><span class="kg-avatar small">😏</span><strong>${escapeHtml(dataset.contactName || dataset.owner)}</strong> · UPDATED ${escapeHtml(dataset.updated)} AGO</p>
          <h1>${escapeHtml(dataset.title)}</h1>
          <p>${escapeHtml(dataset.subtitle || dataset.description)}</p>
        </div>
        <div class="kg-hero-actions">
          <button type="button" class="kg-score" aria-label="Mock upvote"><span>▲</span><strong>${escapeHtml(dataset.likes || "85")}</strong></button>
          <button type="button" data-kg-code>&lt;&gt; Code</button>
          <a class="kg-download" href="${escapeHtml(downloadHref)}"${download}>⇩ Download</a>
          <button type="button" class="kg-medal" aria-label="${escapeHtml(dataset.kaggleMedals)} mock medal"></button>
          <button type="button" data-kg-more aria-label="More actions">⋮</button>
          <div class="kg-code-popover" data-kg-code-popover hidden>
            <strong>Copy API command</strong>
            <pre><code>${escapeHtml(codeSnippet)}</code></pre>
          </div>
          <div class="kg-more-popover" data-kg-more-popover hidden>
            <button type="button" disabled>Report dataset</button>
            <button type="button" disabled>Request edit access</button>
            <button type="button" disabled>Add to collection</button>
          </div>
        </div>
        <div class="kg-cover" aria-label="Mock dataset cover"><strong>${escapeHtml(dataset.title)}</strong><span>${escapeHtml(formatNumber(rowCount))} rows</span></div>
      </section>
      <nav class="kg-tabs" aria-label="Dataset tabs">
        <a class="${activeTab === "data-card" ? "active" : ""}" href="/kaggle/${dataset.slug}/">Data Card</a>
        <a class="${activeTab === "code" ? "active" : ""}" href="/kaggle/${dataset.slug}/code/">Code (${escapeHtml(String(dataset.files.length || 1))})</a>
        <a class="${activeTab === "discussion" ? "active" : ""}" href="/kaggle/${dataset.slug}/discussion/">Discussion (${escapeHtml(String(dataset.discussions.length || 1))})</a>
        <a class="${activeTab === "suggestions" ? "active" : ""}" href="/kaggle/${dataset.slug}/suggestions/">Suggestions (0)</a>
      </nav>
      ${tabContent}
    </main>
    <div class="kg-toast" data-kg-toast hidden>Mock action locked for review.</div>
  </div>
  <script>
    const page = document.querySelector("[data-kaggle-page]");
    const toggle = (button, panel) => button?.addEventListener("click", () => {
      const wasHidden = panel?.hasAttribute("hidden");
      page.querySelectorAll("[data-kg-code-popover],[data-kg-more-popover]").forEach((item) => item.setAttribute("hidden", ""));
      if (wasHidden) panel?.removeAttribute("hidden");
    });
    toggle(page.querySelector("[data-kg-code]"), page.querySelector("[data-kg-code-popover]"));
    toggle(page.querySelector("[data-kg-more]"), page.querySelector("[data-kg-more-popover]"));
    const toast = document.querySelector("[data-kg-toast]");
    const showToast = (message) => {
      if (!toast) return;
      toast.textContent = message;
      toast.removeAttribute("hidden");
      clearTimeout(showToast.timer);
      showToast.timer = setTimeout(() => toast.setAttribute("hidden", ""), 1800);
    };
    page.querySelector(".kg-score")?.addEventListener("click", (event) => {
      event.currentTarget.classList.toggle("active");
      showToast(event.currentTarget.classList.contains("active") ? "Mock upvote recorded." : "Mock upvote removed.");
    });
    page.querySelector("[data-kg-view-more]")?.addEventListener("click", (event) => {
      const expanded = page.classList.toggle("show-more");
      event.currentTarget.textContent = expanded ? "⌃ View less" : "⌄ View more";
    });
    page.querySelectorAll(".kg-metadata-block button").forEach((button) => button.addEventListener("click", () => button.classList.toggle("open")));
    page.querySelectorAll(".kg-tab-heading button").forEach((button) => button.addEventListener("click", () => showToast("This Kaggle action is locked in the mock.")));
  </script>`;
  return kaggleLayout({ title: `${dataset.title} | Shmaggle`, body });
}

function renderKaggleTabContent(dataset, activeTab, { rowCount, fileRows, tags, codeSnippet }) {
  const discussions = dataset.discussions.length ? dataset.discussions : [
    "Does the mock preview communicate the release shape clearly?",
    "Should the real release include a larger validation split?",
    "Please verify the generated download files before publishing.",
  ];
  if (activeTab === "code") {
    return `<section class="kg-content-grid kg-code-page">
      <article class="kg-article">
        <div class="kg-tab-heading">
          <h2>Code</h2>
          <button type="button">New Notebook</button>
        </div>
        <div class="kg-code-card">
          <span>Notebook</span>
          <h3>Quick statistical audit for ${escapeHtml(dataset.title)}</h3>
          <p>Loads the mock CSV, checks row counts, describes numeric columns, and plots pair probability by split.</p>
          <pre class="kg-code-block"><code>${escapeHtml(codeSnippet)}</code></pre>
        </div>
        <div class="kg-code-card">
          <span>Script</span>
          <h3>Download and inspect files</h3>
          <p>Uses the Kaggle-style command line flow reviewers expect before a real dataset release.</p>
          <pre class="kg-code-block"><code>${escapeHtml(`kaggle datasets files ${dataset.owner}/${dataset.slug}\nkaggle datasets download -d ${dataset.owner}/${dataset.slug} --unzip\nls -lh data/`)}</code></pre>
        </div>
      </article>
      <aside class="kg-meta">
        <section><h2>Code type</h2><p>Notebook and utility script mocks</p></section>
        <section><h2>Language</h2><p>Python</p></section>
        <section><h2>Dependencies</h2><div class="kg-tags"><span>pandas</span><span>polars</span><span>matplotlib</span></div></section>
      </aside>
    </section>`;
  }
  if (activeTab === "discussion") {
    return `<section class="kg-content-grid kg-discussion-page">
      <article class="kg-article">
        <div class="kg-tab-heading">
          <h2>Discussion</h2>
          <button type="button">New Topic</button>
        </div>
        <div class="kg-discussion-controls">
          <button type="button" class="active">All</button>
          <button type="button">Questions</button>
          <button type="button">Comments</button>
          <label><span>⌕</span><input placeholder="Search discussions"></label>
        </div>
        <ul class="kg-discussions kg-discussion-list">
          ${discussions.map((item, index) => `<li><div><strong>${escapeHtml(item.title || item)}</strong><p>#${index + 1} opened for review by ${escapeHtml(dataset.contactName || dataset.owner)}</p></div><span>${index + 1} replies</span></li>`).join("")}
        </ul>
      </article>
      <aside class="kg-meta">
        <section><h2>Community guidelines</h2><p>Mock discussion only. No external comments are posted.</p></section>
        <section><h2>Participants</h2><div class="kg-tags"><span>${escapeHtml(dataset.contactName || dataset.owner)}</span><span>Reviewer</span><span>Dataset owner</span></div></section>
      </aside>
    </section>`;
  }
  if (activeTab === "suggestions") {
    return `<section class="kg-content-grid kg-suggestions-page">
      <article class="kg-article">
        <div class="kg-tab-heading">
          <h2>Suggestions</h2>
          <button type="button" disabled>Suggest edit</button>
        </div>
        <div class="kg-empty-state">
          <strong>No suggestions yet</strong>
          <p>This mock shows the empty Kaggle suggestions state reviewers should see before anyone proposes metadata, license, or file changes.</p>
        </div>
        <div class="kg-code-card">
          <span>Suggested checks</span>
          <h3>What reviewers can still inspect</h3>
          <p>Confirm the title, subtitle, tags, license, downloads, and preview rows before this becomes a real release.</p>
        </div>
      </article>
      <aside class="kg-meta">
        <section><h2>Open suggestions</h2><strong>0</strong></section>
        <section><h2>Closed suggestions</h2><p>0</p></section>
      </aside>
    </section>`;
  }
  return `<section class="kg-content-grid">
    <article class="kg-article">
      <h2>About Dataset</h2>
      <p>${escapeHtml(dataset.description)}</p>
      <h3>Objective</h3>
      <p>This deliberately fake release is large enough to exercise row previews, file downloads, metadata, and review copy before a real upload to Kaggle.</p>
      <p><strong>Do an EDA and try to predict which socks and laundry conditions achieve suspiciously stable pair success.</strong></p>
      <div class="kg-article-image" aria-label="Mock dataset illustration"><span>${escapeHtml(dataset.title)}</span></div>
      <button class="kg-view-more" type="button" data-kg-view-more>⌄ View more</button>
    </article>
    <aside class="kg-meta">
      <section><h2>Usability</h2><strong>${escapeHtml(dataset.kaggleUsability)}</strong></section>
      <section><h2>License</h2><a href="/manifest.json">${escapeHtml(dataset.license)}</a></section>
      <section><h2>Expected update frequency</h2><p>Never</p></section>
      <section><h2>Tags</h2><div class="kg-tags">${tags}</div></section>
    </aside>
    <section class="kg-explorer-span">
      ${kaggleDataExplorer(dataset, rowCount)}
    </section>
    <section class="kg-social-proof">
      <h2>See what others are saying about this dataset</h2>
      <div class="kg-survey-grid">
        <section><h3>What have you used this dataset for?</h3><p><strong>Learning</strong><span>9</span></p><p><strong>Research</strong><span>6</span></p><p><strong>Application</strong><span>3</span></p><p><strong>LLM Fine-Tuning</strong><span>0</span></p></section>
        <section><h3>How would you describe this dataset?</h3><p><strong>Well-documented</strong><span>1</span></p><p><strong>Clean data</strong><span>1</span></p><p><strong>Original</strong><span>1</span></p><p><strong>Other</strong><span>0</span></p></section>
      </div>
    </section>
    <section class="kg-metadata-block">
      <h2>Metadata</h2>
      ${["Collaborators", "Authors", "Coverage", "DOI Citation", "Provenance", "License"].map((item) => `<button type="button"><span>⌄</span>${item}</button>`).join("")}
    </section>
    <section class="kg-activity-block">
      <h2>Activity Overview</h2>
      <div><strong>Views</strong><span>34.7K</span><em>880 in the last 30 days</em></div>
      <div><strong>Downloads</strong><span>${escapeHtml(String(dataset.downloads || "6,026"))}</span><em>213 in the last 30 days</em></div>
      <div><strong>Comments</strong><span>${escapeHtml(String(dataset.discussions.length || 1))}</span><em>posted</em></div>
    </section>
  </section>`;
}

function styles() {
  return `:root{color-scheme:light;--ink:#17202a;--muted:#596579;--line:#d9dee8;--panel:#ffffff;--bg:#f6f7f9;--hf:#ffb000;--kg:#20a7db;--green:#1e7f5c}*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:var(--ink);background:var(--bg)}a{color:inherit}.mock-ribbon{background:#1f2937;color:#fff;text-align:center;padding:8px 16px;font-size:13px;font-weight:700}.topbar{height:64px;display:flex;align-items:center;justify-content:space-between;padding:0 28px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}.brand{display:flex;align-items:center;gap:10px;text-decoration:none;font-weight:800}.brand-mark{font-size:24px}.topbar nav{display:flex;gap:14px;align-items:center;flex-wrap:wrap}.topbar nav a{font-size:14px;text-decoration:none;color:var(--muted)}.topbar nav a[aria-current=page]{color:var(--ink);font-weight:700}main{max-width:1180px;margin:0 auto;padding:28px}.home-hero{padding:52px 0 34px}.eyebrow{text-transform:uppercase;letter-spacing:.08em;font-size:12px;font-weight:800;color:var(--green);margin:0 0 10px}.home-hero h1,.repo-header h1{font-size:44px;line-height:1.05;margin:0 0 14px;letter-spacing:0}.home-hero p,.repo-header p{max-width:780px;color:var(--muted);font-size:18px;line-height:1.55}.platform-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:30px}.platform-card{min-height:210px;border:1px solid var(--line);border-radius:8px;background:#fff;padding:24px;text-decoration:none;display:flex;flex-direction:column;gap:14px}.platform-card strong{font-size:24px}.platform-card span:last-child{color:var(--muted);line-height:1.45}.platform-logo{font-weight:900}.hf-card{border-top:6px solid var(--hf)}.kaggle-card{border-top:6px solid var(--kg)}.dataset-list{border-top:1px solid var(--line);padding-top:28px}.dataset-list ul{list-style:none;padding:0;margin:0;display:grid;gap:10px}.dataset-list li{display:flex;justify-content:space-between;background:#fff;border:1px solid var(--line);border-radius:8px;padding:14px 16px}.repo-header{border:1px solid var(--line);border-radius:8px;background:#fff;padding:26px}.repo-header.hf{border-top:6px solid var(--hf)}.repo-header.kaggle{border-top:6px solid var(--kg)}.chips{display:flex;gap:8px;flex-wrap:wrap}.chips span{border:1px solid var(--line);border-radius:999px;padding:5px 10px;font-size:13px;color:var(--muted)}.tabs{display:flex;gap:4px;border-bottom:1px solid var(--line);margin-top:18px;overflow:auto}.tabs a{padding:14px 16px;text-decoration:none;color:var(--muted);white-space:nowrap}.tabs .active{color:var(--ink);font-weight:800;border-bottom:3px solid var(--hf)}.kaggle-tabs .active{border-bottom-color:var(--kg)}.two-col{display:grid;grid-template-columns:minmax(0,1fr) 340px;gap:24px;margin-top:24px}article,aside{background:#fff;border:1px solid var(--line);border-radius:8px;padding:22px}h2{font-size:24px;margin:0 0 12px}h3{font-size:16px;margin:22px 0 10px}.viewer-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:14px 0}.viewer-toolbar input,.viewer-toolbar button,.kaggle-actions button{border:1px solid var(--line);border-radius:6px;background:#fff;padding:9px 11px;font:inherit}.viewer-toolbar span{font-size:13px;color:var(--muted)}.table-shell{overflow:auto;border:1px solid var(--line);border-radius:8px}table{border-collapse:collapse;min-width:720px;width:100%;font-size:14px}th,td{border-bottom:1px solid var(--line);text-align:left;padding:10px 12px;vertical-align:top}th{background:#f0f3f7;font-size:12px;text-transform:uppercase;color:var(--muted)}.stat-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.stat-grid span,.score-card{border:1px solid var(--line);border-radius:8px;padding:12px;color:var(--muted)}.stat-grid strong,.score-card strong{display:block;color:var(--ink);font-size:20px;margin-top:6px}.file-list,.discussion-list{list-style:none;margin:0;padding:0;display:grid;gap:8px}.file-list li{border:1px solid var(--line);border-radius:8px;padding:10px;display:grid;grid-template-columns:1fr auto;gap:4px 10px}.file-list span{font-weight:700}.file-list strong,.file-list em{color:var(--muted);font-size:13px}.file-list a{font-size:13px}.discussion-list li{padding:10px;border-left:3px solid var(--hf);background:#f8fafc}.kaggle-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.kaggle-actions button:first-child{background:#111827;color:#fff}.score-card strong{font-size:38px}dl{display:grid;grid-template-columns:auto 1fr;gap:8px 12px}dt{font-weight:800}dd{margin:0;color:var(--muted)}footer{max-width:1180px;margin:24px auto;padding:20px 28px;color:var(--muted);display:flex;gap:16px;flex-wrap:wrap;border-top:1px solid var(--line)}@media(max-width:820px){.topbar{height:auto;align-items:flex-start;gap:12px;padding:14px 18px;flex-direction:column}main{padding:18px}.home-hero h1,.repo-header h1{font-size:34px}.platform-actions,.two-col{grid-template-columns:1fr}.dataset-list li{align-items:flex-start;gap:6px;flex-direction:column}}`;
}

function hfSpecificStyles() {
  return `
body{background:#fff;color:#111827}.mock-ribbon{background:#111827;color:#fff;padding:7px 16px;font-size:14px;font-weight:700}.hf-topbar{position:sticky;top:0;height:56px;padding:0 6%;gap:14px;justify-content:flex-start;flex-wrap:nowrap;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 4px rgba(15,23,42,.05)}.brand{font-size:20px;color:#111827;white-space:nowrap}.brand-mark{font-size:28px}.global-search{width:min(420px,32vw);height:40px;border:1px solid #d8dee8;border-radius:9px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#9aa3b2;background:#fff}.global-search input{border:0;outline:0;width:100%;font:inherit;font-size:15px;color:#111827}.global-search input::placeholder{color:#8b95a5}.global-nav{margin-left:auto;gap:14px;flex-wrap:nowrap}.global-nav a{font-weight:650;color:#111827;font-size:14px;white-space:nowrap}.global-nav strong{font-size:10px;color:#2563eb;background:#dbeafe;border-radius:4px;padding:2px 4px}.global-nav .avatar{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;border:1px solid #d8dee8;padding:0;flex:0 0 auto}main{max-width:none;padding:0}.hf-repo-hero{padding:54px 6% 34px;background:#fff;border-bottom:1px solid #eef0f4}.hf-title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.hf-title-row h1{margin:0 12px 0 0;font-size:26px;line-height:1.25;font-weight:750;letter-spacing:0;display:flex;align-items:center;gap:8px}.hf-title-row h1 span{color:#98a1b2;font-weight:750}.hf-title-row h1 a{color:#374151;text-decoration:none;font-weight:450}.hf-title-row h1 strong{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:27px}.hf-muted-icon{font-size:17px;color:#c6ccd7}.copy-button{border:0;background:transparent;color:#6b7280;font-size:16px}.small-button,.count-pill{border:1px solid #d8dee8;background:#fff;border-radius:7px;padding:7px 10px;font:inherit;font-size:14px;color:#536073}.count-pill{background:#f8fafc}.hf-meta-grid{display:flex;gap:14px 20px;flex-wrap:wrap;margin-top:18px;max-width:1420px}.meta-line{display:flex;align-items:center;gap:8px;color:#98a1b2}.meta-line span{font-size:14px}.meta-line a{display:inline-flex;align-items:center;min-height:34px;padding:6px 12px;border:1px solid #e3e7ee;border-radius:9px;background:#fff;color:#374151;text-decoration:none;box-shadow:0 4px 12px rgba(15,23,42,.04);font-size:14px}.hf-tabs{height:58px;padding:0 6%;display:flex;align-items:end;gap:22px;border-bottom:1px solid #e5e7eb;background:#fff;overflow:auto}.hf-tabs a{height:100%;display:flex;align-items:center;gap:7px;color:#4b5563;text-decoration:none;font-size:17px;font-weight:520;white-space:nowrap;border-bottom:3px solid transparent}.hf-tabs a.active{color:#111827;font-weight:760;border-bottom-color:#111827}.hf-tabs span{font-size:11px;border:1px solid #e5e7eb;border-radius:7px;padding:1px 5px;color:#4f46e5}.hf-tabs strong{font-size:12px;color:#fff;background:#111827;border-radius:6px;padding:1px 5px}.hf-main-grid{display:grid;grid-template-columns:minmax(0,1fr) 530px;gap:0;max-width:1800px;margin:0 auto}.hf-content{border:0;border-radius:0;padding:32px 32px 56px 6%;background:#fff}.hf-sidebar{border:0;border-left:1px solid #e5e7eb;border-radius:0;padding:32px 6% 56px 32px;background:#fff}.dataset-viewer{border:1px solid #d8dee8;border-radius:10px;box-shadow:0 2px 8px rgba(15,23,42,.06);overflow:hidden;background:#fff}.dataset-viewer header{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid #e5e7eb;gap:12px}.dataset-viewer h2{margin:0;font-size:18px;white-space:nowrap}.viewer-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.viewer-actions a{color:#8b95a5;font-size:13px}.viewer-actions button,.sidebar-actions button{border:1px solid #d8dee8;background:#f8fafc;border-radius:7px;padding:7px 10px;font:inherit;font-size:13px;color:#374151}.viewer-splits{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e5e7eb}.viewer-splits button{min-height:72px;border:0;border-right:1px solid #e5e7eb;background:#fff;text-align:left;padding:12px 16px;display:grid;grid-template-columns:1fr auto;gap:4px 10px;font:inherit}.viewer-splits button:last-child{border-right:0}.viewer-splits span{grid-column:1/-1;color:#687386;font-size:14px}.viewer-splits strong{font-size:15px}.viewer-splits em{font-style:normal;font-size:22px;align-self:center}.viewer-menu-row{display:grid;grid-template-columns:1fr 1fr;background:#fbfcfe;border-bottom:1px solid #e5e7eb}.viewer-menu{padding:10px 16px;display:flex;gap:8px;flex-wrap:wrap}.viewer-menu+ .viewer-menu{border-left:1px solid #e5e7eb}.viewer-menu button{border:1px solid #d8dee8;border-radius:999px;background:#fff;padding:6px 10px;font:inherit;font-size:13px}.viewer-search{height:48px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;padding:0 16px;color:#98a1b2}.viewer-search input{border:0;outline:0;width:100%;font:inherit;font-size:16px}.viewer-panels{border-bottom:1px solid #e5e7eb}.viewer-panel{padding:12px 16px;background:#f8fafc;color:#374151;font-size:13px}.viewer-panel code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.viewer-column-profile{padding:14px 16px;border-bottom:1px solid #e5e7eb;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.viewer-column-profile strong{display:block;font-size:15px}.viewer-column-profile span{color:#7b8494;font-size:14px;font-style:italic}.mini-histogram{height:42px;display:flex;align-items:end;gap:4px;margin-top:8px}.mini-histogram i{display:block;width:14px;background:#98a1b2;border-radius:2px 2px 0 0}.viewer-column-profile small{display:flex;width:176px;justify-content:space-between;color:#8b95a5}.hf-row-preview{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:15px;color:#1f2937}.preview-row{padding:14px 16px;border-bottom:1px solid #e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.preview-heading{background:#fbfcfe}.viewer-pagination{height:50px;display:flex;align-items:center;justify-content:center;gap:18px;color:#6b7280;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;border-top:1px solid #e5e7eb}.viewer-pagination button{border:0;background:transparent;color:#6b7280;font:inherit;cursor:pointer}.viewer-pagination button.active{border:1px solid #d8dee8;border-radius:10px;padding:6px 12px;color:#111827;background:#fff}.viewer-status{margin:0;padding:8px 16px;border-top:1px solid #e5e7eb;color:#687386;font-size:13px}.hf-card-markdown{margin-top:54px}.hf-card-markdown h2{font-size:24px;color:#263244}.hf-card-markdown p{font-size:16px;line-height:1.6;color:#374151}.sidebar-action-shell{position:relative;border-bottom:1px solid #eef0f4;padding-bottom:26px}.sidebar-actions{display:flex;gap:10px}.sidebar-actions .primary-action{background:#030712;color:#fff;border-color:#030712;min-width:210px;font-weight:700}.sidebar-popover{position:absolute;right:0;top:58px;z-index:4;width:min(460px,100%);border:1px solid #d8dee8;border-radius:10px;background:#fff;box-shadow:0 18px 40px rgba(15,23,42,.18);padding:16px}.sidebar-popover strong{display:block;font-size:17px;margin-bottom:12px}.code-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.code-tabs button{border:1px solid #d8dee8;border-radius:7px;background:#fff;padding:7px 10px;font:inherit;font-size:13px}.code-tabs button.active{background:#111827;color:#fff;border-color:#111827}.sidebar-popover pre{margin:0;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;padding:12px;overflow:auto}.sidebar-popover code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;white-space:pre}.locked-popover{background:repeating-linear-gradient(135deg,#fff,#fff 12px,#f8fafc 12px,#f8fafc 24px)}.locked-popover p{margin:0;color:#687386;line-height:1.45}.more-popover{width:260px;display:grid;gap:8px}.more-popover button{border:1px solid #e5e7eb;border-radius:7px;background:#f3f4f6;color:#9aa3b2;padding:9px 10px;text-align:left;font:inherit;text-decoration:line-through;cursor:not-allowed}.downloads-row{height:88px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;justify-content:space-between;gap:20px}.downloads-row span{color:#667085;font-size:15px}.downloads-row span:after{content:"";display:inline-block;width:150px;border-bottom:1px dotted #d8dee8;margin-left:16px;vertical-align:middle}.downloads-row strong{font-size:19px}.hf-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;border-bottom:1px solid #eef0f4;padding:26px 0 28px}.hf-info-grid div{border:1px solid #e5e7eb;border-radius:9px;padding:10px 12px}.hf-info-grid dt{font-size:13px;color:#98a1b2;font-weight:650}.hf-info-grid dd{font-size:14px;color:#111827;margin-top:4px}.hf-info-grid a{color:#111827;text-decoration:none}.hf-info-grid a:hover{text-decoration:underline}.hf-side-section{border-bottom:1px solid #eef0f4;padding:24px 0}.hf-side-section h3{font-size:18px;margin:0 0 14px;color:#1f2937}.hf-files{list-style:none;margin:0;padding:0;display:grid;gap:10px}.hf-files li{border:1px solid #e5e7eb;border-radius:10px;padding:11px 12px;display:grid;grid-template-columns:1fr auto;gap:5px 10px}.hf-files span{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700}.hf-files strong,.hf-files em,.hf-files a{font-size:13px;color:#8b95a5}.hf-model-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}.hf-model-list li{border:1px solid #e5e7eb;border-radius:10px;padding:12px;box-shadow:0 1px 4px rgba(15,23,42,.04)}.hf-model-list strong{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hf-model-list span{display:block;color:#98a1b2;font-size:13px;margin-top:5px}.hf-compact-header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 6%;height:58px;border-bottom:1px solid #e5e7eb;background:#fff;overflow:hidden}.hf-compact-header .hf-title-row{min-width:0;flex:1;flex-wrap:nowrap;overflow:hidden}.hf-compact-header .hf-title-row h1{font-size:19px;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.hf-compact-header .hf-title-row h1 strong{font-size:20px}.hf-compact-header .hf-title-row .small-button,.hf-compact-header .hf-title-row .count-pill{flex:0 0 auto}.hf-compact-header .hf-tabs{height:100%;padding:0;border-bottom:0;flex:0 0 auto;align-items:end}.hf-compact-header .hf-tabs a{font-size:16px}.data-studio-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(420px,1fr);gap:16px;padding:16px;background:#fff}.studio-viewer-column,.studio-agent-column{min-height:calc(100vh - 170px)}.studio-viewer-column .dataset-viewer{height:100%;border-radius:8px}.studio-dataset-viewer header{display:none}.studio-dataset-viewer .viewer-splits{border-top:0}.studio-dataset-viewer .hf-row-preview{font-size:14px}.studio-dataset-viewer .preview-row{padding:13px 14px}.studio-panel-actions{display:flex;gap:6px;margin-left:auto}.studio-panel-actions button{border:1px solid #d8dee8;background:#fff;border-radius:7px;padding:5px 8px;font:inherit}.studio-agent-column{position:relative;border:1px solid #d8dee8;border-radius:8px;background:#fff;padding:0;display:grid;grid-template-rows:auto 1fr auto;box-shadow:0 1px 4px rgba(15,23,42,.04)}.studio-agent-tabs{height:54px;display:flex;justify-content:center;gap:30px;border-bottom:1px solid #e5e7eb}.studio-agent-tabs button{border:0;background:transparent;font:inherit;color:#536073;padding:0 8px;border-bottom:3px solid transparent}.studio-agent-tabs button.active{color:#111827;font-weight:750;border-bottom-color:#111827}.studio-agent-tabs span{background:#e5e7eb;border-radius:5px;padding:2px 7px;font-size:12px;font-weight:800}.studio-agent-body{display:grid;place-items:center;padding:26px}.studio-agent-body pre{width:100%;align-self:start;margin:0;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;padding:16px;overflow:auto}.studio-agent-body code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px}.studio-agent-empty{text-align:center;max-width:560px;color:#687386}.studio-agent-empty strong{display:block;color:#111827;font-size:18px;margin-top:12px}.studio-agent-empty p{margin:10px 0 20px}.studio-agent-icon{width:42px;height:42px;border-radius:14px;background:#fee2e2;color:#ef4444;display:inline-grid;place-items:center;font-weight:900}.studio-split-pills{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}.studio-split-pills button{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:9px 16px;font:inherit;color:#4b5563;box-shadow:0 1px 3px rgba(15,23,42,.04)}.studio-split-pills button.active{border-color:#111827;color:#111827;background:#f8fafc}.studio-split-pills .more-splits{border-style:dashed}.studio-chatbar{margin:14px 16px 16px;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 2px 10px rgba(15,23,42,.08);padding:12px;display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center}.studio-chatbar input{border:0;outline:0;font:inherit;color:#111827}.studio-chatbar input:disabled{background:#fff;color:#8b95a5}.studio-chatbar span{font-size:12px;color:#536073;border:1px solid #e5e7eb;border-radius:999px;padding:6px 9px}.studio-chatbar button{width:38px;height:38px;border:0;border-radius:999px;background:#a3a8b3;color:#fff;font-size:20px}.hf-files-page{max-width:1720px;margin:0 auto;padding:36px 6% 56px;background:#fff}.file-browser-toolbar{display:flex;align-items:center;gap:16px;margin-bottom:22px}.file-browser-toolbar button{border:1px solid #d8dee8;background:#fff;border-radius:10px;padding:10px 16px;font:inherit;color:#374151}.file-repo-name{font-size:20px;font-weight:650}.repo-size{border:1px solid #d8dee8;border-radius:8px;padding:6px 10px;color:#687386;background:#f8fafc}.contributors{margin-left:auto;display:flex;align-items:center;gap:7px;color:#536073}.contributors span{width:22px;height:22px;border-radius:999px;border:1px solid #fff;margin-left:-10px;background:#f8fafc;display:grid;place-items:center;font-size:12px}.contributors span:first-child{margin-left:0}.contributors strong{font-size:14px;font-weight:550}.files-menu-row{position:relative}.files-popover{position:absolute;z-index:5;right:0;top:-12px;width:260px;border:1px solid #d8dee8;border-radius:10px;background:#fff;box-shadow:0 18px 40px rgba(15,23,42,.16);padding:12px;display:grid;gap:8px}.files-popover button{border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:9px 10px;text-align:left;font:inherit}.files-popover button:disabled{color:#9aa3b2;text-decoration:line-through;background:#f3f4f6;cursor:not-allowed}.history-popover{right:210px}.history-popover strong{font-size:14px}.history-popover span{font-size:13px;color:#536073}.file-browser{border:1px solid #d8dee8;border-radius:10px;overflow:hidden;background:#fff}.commit-banner{height:56px;display:grid;grid-template-columns:auto auto auto minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:0 18px;background:#fbfcfe;border-bottom:1px solid #e5e7eb}.commit-banner span{font-size:18px}.commit-banner strong{font-size:16px}.commit-banner em{font-style:normal;background:#fef3c7;color:#b45309;border-radius:6px;padding:3px 7px;font-size:12px;font-weight:750}.commit-banner code,.repo-file-row .file-message{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#8b95a5}.commit-banner kbd{border:1px solid #d8dee8;border-radius:6px;padding:4px 8px;background:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.commit-banner time,.repo-file-row .file-age{color:#8b95a5;white-space:nowrap}.repo-file-row{min-height:56px;display:grid;grid-template-columns:minmax(260px,1fr) 110px 42px minmax(260px,1fr) 150px;align-items:center;gap:12px;padding:0 18px;border-bottom:1px solid #e5e7eb}.repo-file-row:last-child{border-bottom:0}.repo-file-row.folder-row{grid-template-columns:minmax(260px,1fr) minmax(260px,1fr) 150px 42px}.file-name{font-weight:650;color:#111827;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.file-size{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#8b95a5;text-align:right}.file-download{width:28px;height:28px;border:1px solid #d8dee8;border-radius:7px;display:grid;place-items:center;text-decoration:none;color:#536073}.safe-pill{display:inline-flex;align-items:center;border:1px solid #d8dee8;border-radius:6px;padding:2px 5px;color:#8b95a5;font-size:12px;font-weight:650;margin-left:5px;background:#f8fafc}.community-page{display:grid;grid-template-columns:320px minmax(0,1fr);gap:72px;max-width:1720px;margin:0 auto;padding:36px 6% 80px;background:#fff}.community-sidebar{display:flex;flex-direction:column;gap:14px;align-items:flex-start}.community-sidebar button{width:220px;border:1px solid #d8dee8;background:#f8fafc;border-radius:9px;padding:10px 14px;text-align:left;font:inherit;font-weight:700;color:#1f2937}.community-sidebar p{margin:0;color:#687386;font-size:13px}.community-sidebar h3{margin:22px 0 8px;font-size:16px}.community-sidebar a{font-size:14px;text-decoration:none;color:#111827}.community-main{min-width:0}.community-controls{display:flex;align-items:center;gap:16px;margin-bottom:24px;flex-wrap:wrap}.community-filter-tabs{display:flex;align-items:center;gap:12px}.community-filter-tabs button{border:0;background:transparent;border-radius:8px;padding:7px 10px;font:inherit;color:#536073}.community-filter-tabs button.active{background:#050505;color:#fff;font-weight:750}.community-search{height:34px;width:240px;border:1px solid #d8dee8;border-radius:999px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#98a1b2;background:#fff}.community-search input{border:0;outline:0;width:100%;font:inherit;font-size:13px}.community-controls label{display:flex;align-items:center;gap:8px;color:#374151;font-size:14px}.community-controls input[type=checkbox]{width:18px;height:18px;accent-color:#111827}.community-controls>button{margin-left:auto;border:1px solid #d8dee8;background:#f8fafc;border-radius:9px;padding:9px 14px;font:inherit;color:#1f2937}.community-list{display:grid;gap:14px}.community-row{min-height:74px;border:1px solid #e5e7eb;border-radius:8px;display:grid;grid-template-columns:78px minmax(0,1fr) auto;align-items:center;background:#fff;overflow:hidden}.community-row.pull-row .community-icon{background:#ecfdf5;color:#059669}.community-row.discussion-row .community-icon{background:#f8fbff;color:#2563eb}.community-icon{height:100%;display:grid;place-items:center;font-weight:900;font-size:20px}.community-copy{padding:13px 18px}.community-copy h3{margin:0 0 7px;font-size:16px;color:#111827}.community-copy p{margin:0;color:#687386;font-size:13px}.community-copy a{color:#536073;text-decoration:underline}.community-badge{margin-right:18px;border:1px solid #e5e7eb;border-radius:7px;padding:4px 8px;color:#536073;font-size:12px;background:#fff}.community-empty{border:1px dashed #d8dee8;border-radius:10px;padding:18px;color:#687386;text-align:center}[hidden]{display:none!important}
@media(max-width:1100px){.hf-topbar{padding:10px 20px;height:auto;flex-wrap:wrap}.global-search{order:3;width:100%}.global-nav{margin-left:0}.hf-repo-hero,.hf-tabs{padding-left:24px;padding-right:24px}.hf-main-grid{grid-template-columns:1fr}.hf-content,.hf-sidebar{padding:24px}.hf-sidebar{border-left:0;border-top:1px solid #e5e7eb}.dataset-viewer header{height:auto;align-items:flex-start;flex-direction:column;padding:14px 16px}.viewer-splits{grid-template-columns:1fr}.viewer-splits button{border-right:0;border-bottom:1px solid #e5e7eb}.hf-info-grid{grid-template-columns:1fr}}`;
}

function kaggleSpecificStyles() {
  return `
.kg-body{background:#fff;color:#202124;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.kg-body .mock-ribbon{position:sticky;top:0;z-index:20;background:#111827;color:#fff}.kg-shell{display:grid;grid-template-columns:350px minmax(0,1fr);min-height:calc(100vh - 34px)}.kg-sidebar{position:sticky;top:34px;align-self:start;height:calc(100vh - 34px);border-right:1px solid #dadce0;background:#fff;padding:22px 31px;overflow:auto}.kg-sidebar-top{display:flex;align-items:center;gap:28px;margin-bottom:38px}.kg-sidebar-top button{border:0;background:transparent;font-size:30px;line-height:1;cursor:pointer}.kg-wordmark{color:#20a7db;text-decoration:none;font-size:40px;line-height:1;font-weight:500;letter-spacing:-.02em}.kg-create{width:160px;height:68px;border:1px solid #dadce0;border-radius:999px;box-shadow:0 2px 8px rgba(60,64,67,.24);display:flex;align-items:center;justify-content:center;gap:14px;text-decoration:none;color:#3c4043;font-size:19px;margin-bottom:28px}.kg-create span{font-size:46px;line-height:0;color:#20a7db;font-weight:300}.kg-primary-nav{display:grid;gap:7px;border-bottom:1px solid #dadce0;padding-bottom:26px}.kg-primary-nav a,.kg-work a{height:52px;display:flex;align-items:center;gap:22px;color:#5f6368;text-decoration:none;font-size:20px;border-radius:999px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.kg-primary-nav span{width:28px;text-align:center;color:#5f6368}.kg-work{padding-top:20px}.kg-work h2{font-size:18px;margin:0 0 12px;color:#5f6368;font-weight:600}.kg-work h3{font-size:18px;color:#5f6368;margin:18px 0 8px;font-weight:500}.kg-thumb{width:28px;height:28px;border-radius:6px;background:#dff3fd;color:#20a7db;display:grid;place-items:center;font-weight:800;flex:0 0 auto}.kg-main{min-width:0;background:#fff}.kg-topbar{height:96px;display:flex;align-items:center;gap:28px;padding:0 6% 0 64px;border-bottom:0}.kg-search{height:66px;max-width:1460px;flex:1;border:1px solid #dadce0;border-radius:999px;display:flex;align-items:center;gap:18px;padding:0 32px;color:#202124}.kg-search span{font-size:36px;line-height:1}.kg-search input{border:0;outline:0;width:100%;font:inherit;font-size:19px}.kg-search input::placeholder{color:#5f6368}.kg-avatar{width:42px;height:42px;border:3px solid #20a7db;border-radius:999px;display:grid;place-items:center;text-decoration:none;background:#fff}.kg-avatar.small{width:46px;height:46px;font-size:24px;display:inline-grid;margin-right:20px;vertical-align:middle}.kg-hero{display:grid;grid-template-columns:minmax(0,1fr) auto 384px;gap:32px;padding:52px 6% 0 64px;align-items:start}.kg-author{display:flex;align-items:center;margin:0 0 88px;color:#5f6368;font-size:14px;font-weight:800;letter-spacing:.08em}.kg-author strong{color:#5f6368;text-transform:uppercase}.kg-hero h1{font-size:49px;line-height:1.22;margin:0 0 18px;color:#202124;font-weight:800;max-width:980px}.kg-hero p:not(.kg-author){font-size:21px;line-height:1.45;color:#5f6368;margin:0;max-width:990px}.kg-hero-actions{position:relative;display:flex;align-items:center;gap:22px;justify-self:end;grid-column:2/4}.kg-hero-actions button,.kg-hero-actions a{height:52px;border:1px solid #bdc1c6;border-radius:999px;background:#fff;color:#202124;text-decoration:none;font:inherit;font-size:20px;font-weight:750;padding:0 22px;display:inline-flex;align-items:center;gap:12px}.kg-score{padding:0!important;overflow:hidden}.kg-score span{height:100%;width:52px;display:grid;place-items:center;border-right:1px solid #bdc1c6}.kg-score strong{padding:0 18px}.kg-download{background:#202124!important;color:#fff!important;border-color:#202124!important}.kg-medal{width:26px!important;height:26px!important;padding:0!important;background:linear-gradient(135deg,#bd7a3b,#f4d098)!important;border:0!important}.kg-hero-actions [data-kg-more]{width:42px;padding:0!important;border:0;background:transparent;font-size:32px}.kg-code-popover,.kg-more-popover{position:absolute;right:0;top:62px;z-index:10;width:520px;border:1px solid #dadce0;border-radius:12px;background:#fff;box-shadow:0 18px 44px rgba(60,64,67,.28);padding:18px}.kg-code-popover strong{display:block;margin-bottom:12px}.kg-code-popover pre,.kg-code-block{margin:0;background:#f8f9fa;border:1px solid #e8eaed;border-radius:10px;padding:16px;overflow:auto}.kg-code-popover code,.kg-code-block code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:14px}.kg-more-popover{width:280px;display:grid;gap:8px}.kg-more-popover button{height:auto;border-radius:8px;background:#f1f3f4;color:#9aa0a6;text-decoration:line-through;cursor:not-allowed;padding:10px 12px}.kg-cover{grid-column:3;grid-row:2;min-height:194px;border-radius:16px;background:radial-gradient(circle at 18% 45%,#7c3aed 0 35px,transparent 36px),radial-gradient(circle at 48% 60%,#facc15 0 58px,transparent 59px),radial-gradient(circle at 82% 42%,#f472b6 0 34px,transparent 35px),linear-gradient(135deg,#ddb7ff,#92d5ff);padding:30px;color:#202124;display:flex;flex-direction:column;justify-content:center;box-shadow:inset 0 0 0 1px rgba(255,255,255,.35)}.kg-cover strong{font-size:28px;line-height:1.1;max-width:260px}.kg-cover span{font-size:18px;margin-top:12px;font-weight:700}.kg-tabs{height:72px;margin:30px 0 0;padding:0 6% 0 64px;border-bottom:1px solid #dadce0;display:flex;align-items:end;gap:34px}.kg-tabs a{height:100%;display:flex;align-items:center;color:#5f6368;text-decoration:none;font-size:22px;font-weight:550;border-bottom:6px solid transparent}.kg-tabs a.active{color:#202124;border-bottom-color:#202124}.kg-content-grid{display:grid;grid-template-columns:minmax(0,1fr) 370px;gap:64px;padding:50px 6% 90px 64px}.kg-article{border:0;border-radius:0;padding:0;background:#fff}.kg-article h2{font-size:32px;margin:0 0 52px;color:#202124}.kg-article h3{font-size:19px;margin:26px 0 8px;color:#3c4043}.kg-article p{font-size:19px;line-height:1.48;color:#3c4043;margin:0 0 22px}.kg-explorer-toolbar{display:flex;align-items:center;gap:10px;margin:14px 0}.kg-explorer-toolbar button{border:1px solid #dadce0;border-radius:999px;background:#fff;padding:8px 14px;font:inherit;font-size:15px}.kg-explorer-toolbar span{font-size:14px;color:#5f6368}.kg-article .table-shell{border-color:#dadce0;border-radius:8px;max-height:420px}.kg-article table{font-size:14px}.kg-article th{background:#f8f9fa;color:#5f6368}.kg-meta{border:0;border-radius:0;padding:0;background:#fff}.kg-meta section{border-bottom:1px solid #f1f3f4;padding:0 0 28px;margin-bottom:28px}.kg-meta h2{font-size:22px;margin:0 0 8px;color:#202124}.kg-meta strong{font-size:20px}.kg-meta p,.kg-meta a{font-size:19px;color:#5f6368}.kg-meta ul{list-style:none;margin:0;padding:0;display:grid;gap:10px}.kg-meta li{display:grid;grid-template-columns:1fr auto;gap:6px 10px;border:1px solid #dadce0;border-radius:10px;padding:10px}.kg-meta li span{font-weight:650;grid-column:1/-1}.kg-meta li strong{font-size:14px;color:#5f6368}.kg-meta li a{font-size:14px;color:#1a73e8}.kg-tags{display:flex;gap:12px;flex-wrap:wrap}.kg-tags span{border:1px solid #dadce0;border-radius:999px;padding:10px 18px;font-size:19px;color:#3c4043}.kg-discussions{list-style:none;margin:0;padding:0;display:grid;gap:10px}.kg-discussions li{border:1px solid #dadce0;border-radius:10px;padding:14px;display:flex;justify-content:space-between;gap:20px}.kg-discussions span{color:#5f6368}@media(max-width:1200px){.kg-shell{grid-template-columns:1fr}.kg-sidebar{position:static;height:auto;border-right:0;border-bottom:1px solid #dadce0}.kg-primary-nav{grid-template-columns:repeat(2,minmax(0,1fr))}.kg-hero{grid-template-columns:1fr;padding:32px 24px 0}.kg-hero-actions,.kg-cover{grid-column:1;grid-row:auto;justify-self:start}.kg-tabs,.kg-topbar,.kg-content-grid{padding-left:24px;padding-right:24px}.kg-content-grid{grid-template-columns:1fr}.kg-author{margin-bottom:32px}}@media(max-width:720px){.kg-wordmark{font-size:34px}.kg-sidebar{padding:18px}.kg-primary-nav{grid-template-columns:1fr}.kg-topbar{height:auto;padding-top:16px;padding-bottom:16px}.kg-search{height:52px}.kg-hero h1{font-size:34px}.kg-hero-actions{gap:10px;flex-wrap:wrap}.kg-hero-actions button,.kg-hero-actions a{font-size:16px}.kg-tabs{gap:18px;overflow:auto}.kg-tabs a{font-size:18px}.kg-content-grid{gap:28px}.kg-code-popover{width:min(520px,calc(100vw - 48px));left:0;right:auto}}`;
}

function kaggleTabStyles() {
  return `
	.kg-tab-heading{display:flex;align-items:center;justify-content:space-between;gap:20px;margin-bottom:28px}.kg-tab-heading h2{margin:0}.kg-tab-heading button,.kg-discussion-controls button{border:1px solid #dadce0;border-radius:999px;background:#fff;padding:10px 18px;font:inherit;font-weight:700;color:#202124}.kg-tab-heading button:disabled{color:#9aa0a6;background:#f1f3f4;text-decoration:line-through;cursor:not-allowed}.kg-code-card{border:1px solid #dadce0;border-radius:12px;padding:22px;margin-bottom:18px;background:#fff}.kg-code-card span{display:inline-flex;border:1px solid #dadce0;border-radius:999px;padding:5px 10px;color:#5f6368;font-size:13px}.kg-code-card h3{font-size:22px;margin:14px 0 8px}.kg-code-card p{font-size:16px}.kg-discussion-controls{display:flex;align-items:center;gap:12px;margin-bottom:20px;flex-wrap:wrap}.kg-discussion-controls button.active{background:#202124;color:#fff;border-color:#202124}.kg-discussion-controls label{height:38px;border:1px solid #dadce0;border-radius:999px;display:flex;align-items:center;gap:8px;padding:0 14px;color:#9aa0a6}.kg-discussion-controls input{border:0;outline:0;font:inherit}.kg-discussion-list li{align-items:center}.kg-discussion-list p{font-size:14px;color:#5f6368;margin:6px 0 0}.kg-empty-state{border:1px dashed #dadce0;border-radius:14px;padding:48px;text-align:center;margin-bottom:22px;background:#f8f9fa}.kg-empty-state strong{display:block;font-size:24px;margin-bottom:8px}.kg-empty-state p{max-width:620px;margin:0 auto;color:#5f6368}.kg-code-page .kg-meta,.kg-discussion-page .kg-meta,.kg-suggestions-page .kg-meta{padding-top:68px}`;
}

function kaggleAlignmentStyles() {
  return `
	.kg-body .mock-ribbon{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;padding:0;border:0}.kg-shell{grid-template-columns:340px minmax(0,1fr);min-height:100vh}.kg-sidebar{top:0;height:100vh;padding:20px 30px}.kg-sidebar-top{gap:28px;margin-bottom:42px}.kg-sidebar-top button{font-size:24px}.kg-wordmark{font-size:32px;font-weight:500}.kg-create{width:186px;height:68px;gap:16px;font-size:20px;margin-bottom:28px}.kg-create span{font-size:46px}.kg-primary-nav{gap:8px;padding-bottom:30px}.kg-primary-nav a,.kg-work a{height:52px;gap:24px;font-size:20px}.kg-primary-nav span{width:24px;font-size:18px}.kg-work{padding-top:26px}.kg-work h2{font-size:18px;margin:0 0 20px}.kg-work h3{font-size:18px;margin:0 0 12px}.kg-thumb{width:28px;height:28px}.kg-topbar{height:76px;padding:0 28px 0 64px;gap:28px}.kg-search{height:64px;max-width:none;padding:0 28px;gap:18px}.kg-search span{font-size:28px}.kg-search input{font-size:18px}.kg-avatar{width:42px;height:42px}.kg-avatar.small{width:44px;height:44px;font-size:22px;margin-right:20px}.kg-hero{grid-template-columns:minmax(0,1fr) 384px;grid-template-rows:auto auto;column-gap:32px;row-gap:42px;padding:48px 28px 0 64px}.kg-dataset-copy{grid-column:1;grid-row:1/3}.kg-author{margin:0 0 86px;font-size:13px;line-height:1.15;letter-spacing:.08em}.kg-hero h1{font-size:47px;line-height:1.18;margin:0 0 18px;max-width:470px}.kg-hero p:not(.kg-author){font-size:20px;line-height:1.35;max-width:530px}.kg-hero-actions{grid-column:2;grid-row:1;justify-self:end;gap:20px;align-self:start;margin-top:0}.kg-hero-actions button,.kg-hero-actions a{height:52px;font-size:20px;padding:0 24px}.kg-score span{width:50px}.kg-score strong{padding:0 19px}.kg-medal{width:24px!important;height:24px!important}.kg-hero-actions [data-kg-more]{width:32px;font-size:30px}.kg-cover{grid-column:2;grid-row:2;width:384px;min-height:188px;justify-self:end;padding:28px;border-radius:14px}.kg-cover strong{font-size:28px}.kg-cover span{font-size:17px}.kg-tabs{height:72px;margin:20px 0 0;padding:0 28px 0 64px;gap:34px}.kg-tabs a{font-size:22px;border-bottom-width:6px}.kg-content-grid{grid-template-columns:minmax(0,1fr) 360px;gap:64px;padding:46px 28px 90px 64px}.kg-article h2{font-size:32px;margin-bottom:52px}.kg-article h3{font-size:18px}.kg-article p{font-size:18px;line-height:1.48}.kg-meta h2{font-size:20px}.kg-meta strong{font-size:18px}.kg-meta p,.kg-meta a{font-size:18px}.kg-tags span{font-size:18px;padding:9px 17px}@media(max-width:1200px){.kg-shell{grid-template-columns:1fr}.kg-hero{grid-template-columns:1fr;padding:32px 24px 0}.kg-dataset-copy,.kg-hero-actions,.kg-cover{grid-column:1;grid-row:auto;justify-self:start}.kg-tabs,.kg-topbar,.kg-content-grid{padding-left:24px;padding-right:24px}.kg-author{margin-bottom:32px}}`;
}

function kaggleExplorerStyles() {
  return `
	.kg-explorer-span{grid-column:1/-1}.kg-explorer-span>h2{font-size:32px;margin:12px 0 24px}.kg-data-explorer{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:32px;margin-top:16px}.kg-de-main{border:1px solid #dadce0;border-radius:12px;background:#fff;overflow:hidden}.kg-de-header{height:80px;display:flex;align-items:center;justify-content:space-between;gap:18px;padding:0 24px}.kg-de-header h3{margin:0;font-size:24px;line-height:1.2;color:#202124}.kg-de-header h3 span{color:#5f6368;font-weight:500}.kg-de-actions{display:flex;gap:16px;align-items:center}.kg-de-actions a,.kg-de-actions button{border:0;background:transparent;color:#3c4043;font:inherit;font-size:26px;text-decoration:none;cursor:pointer}.kg-de-toolbar{position:relative;height:72px;border-top:1px solid transparent;border-bottom:1px solid #dadce0;display:flex;align-items:end;justify-content:space-between;gap:16px;padding:0 20px}.kg-de-modes{height:100%;display:flex;align-items:end;gap:30px}.kg-de-modes button{height:100%;border:0;border-bottom:5px solid transparent;background:transparent;font:inherit;font-size:20px;color:#5f6368;padding:0;cursor:pointer}.kg-de-modes button.active{color:#202124;border-bottom-color:#202124}.kg-de-column-count{border:0;background:transparent;font:inherit;font-size:18px;color:#5f6368;padding:0 0 22px;cursor:pointer}.kg-de-column-menu{position:absolute;right:16px;top:62px;z-index:5;width:270px;max-height:280px;overflow:auto;border:1px solid #dadce0;border-radius:10px;background:#fff;box-shadow:0 16px 36px rgba(60,64,67,.24);padding:12px;display:grid;gap:8px}.kg-de-column-menu label{font-size:14px;color:#3c4043}.kg-de-table-wrap{max-height:560px;overflow:auto}.kg-de-table{min-width:1120px;border-collapse:separate;border-spacing:0;width:100%;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#5f6368}.kg-de-table th,.kg-de-table td{border-right:1px solid #dadce0;border-bottom:1px solid #dadce0;min-width:190px;max-width:230px;padding:12px 14px;vertical-align:top;background:#fff}.kg-de-table th{position:sticky;top:0;z-index:2;height:92px;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-transform:none;color:#202124}.kg-de-col-title{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px}.kg-de-col-title span{font-size:12px;text-decoration:underline}.kg-de-col-title strong{font-size:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kg-de-col-title button{border:0;background:transparent;color:#5f6368;font-size:19px;cursor:pointer}.kg-de-table th em{display:block;margin-top:12px;color:#5f6368;font-style:normal;font-weight:500;font-size:14px}.kg-de-profile td{position:sticky;top:92px;z-index:1;height:112px;background:#fff;box-shadow:0 9px 16px rgba(60,64,67,.2)}.kg-de-profile strong{display:block;text-align:center;font-size:22px;color:#202124}.kg-de-profile span{display:block;text-align:center;color:#202124;font-family:Inter,ui-sans-serif,system-ui}.kg-de-profile dl{display:grid;grid-template-columns:1fr auto;gap:2px 10px;margin:0}.kg-de-profile dt{font-weight:800;color:#202124;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.kg-de-profile dd{margin:0;font-weight:800;color:#202124}.kg-de-profile dt:last-of-type,.kg-de-profile dd:last-of-type{background:#e8eaed;color:#5f6368}.kg-de-side{padding-top:2px}.kg-de-side h3{font-size:24px;margin:0 0 12px}.kg-de-side>a{display:inline-block;color:#202124;font-size:18px;text-decoration:underline;margin-bottom:22px}.kg-de-side>a span{color:#5f6368}.kg-de-file{height:42px;background:#f1f3f4;display:flex;align-items:center;gap:12px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font-size:18px;margin-bottom:34px}.kg-de-file span{font-size:22px}.kg-de-side section{border-top:1px solid #dadce0;border-bottom:1px solid #dadce0;padding:28px 0}.kg-de-side h4{font-size:22px;margin:0 0 18px}.kg-de-side p{display:flex;align-items:center;gap:14px;margin:22px 0;color:#5f6368}.kg-de-side strong{font-size:20px;color:#5f6368}.kg-data-explorer[data-mode=compact] .kg-de-profile,.kg-data-explorer[data-mode=compact] .kg-de-table th em{display:none}.kg-data-explorer[data-mode=compact] .kg-de-table th{height:52px}.kg-data-explorer[data-mode=compact] .kg-de-table td{padding:8px 12px;min-width:160px}.kg-data-explorer[data-mode=column] .kg-de-table th:not(:first-child),.kg-data-explorer[data-mode=column] .kg-de-table td:not(:first-child){display:none}.kg-data-explorer[data-mode=column] .kg-de-table{min-width:520px}.kg-data-explorer[data-mode=column] .kg-de-table th,.kg-data-explorer[data-mode=column] .kg-de-table td{max-width:none;width:100%}.kg-data-explorer.summary-collapsed{grid-template-columns:minmax(0,1fr) 0;gap:0}.kg-data-explorer.summary-collapsed .kg-de-side{display:none}.kg-data-explorer.fullscreen{position:fixed;z-index:50;inset:24px;background:#fff;padding:24px;grid-template-columns:minmax(0,1fr) 300px}.kg-data-explorer.fullscreen .kg-de-table-wrap{max-height:calc(100vh - 220px)}@media(max-width:1200px){.kg-data-explorer{grid-template-columns:1fr}.kg-de-side{display:none}.kg-data-explorer.fullscreen{inset:10px;grid-template-columns:1fr}}@media(max-width:720px){.kg-de-header{height:auto;align-items:flex-start;padding:18px;flex-direction:column}.kg-de-toolbar{height:auto;align-items:flex-start;padding:0 16px;flex-direction:column}.kg-de-modes{height:58px}.kg-de-column-count{padding:0 0 14px}.kg-de-table th,.kg-de-table td{min-width:160px}.kg-de-header h3{font-size:20px}}`;
}

function kaggleFidelityStyles() {
  return `
	.kg-body{background:#fff;color:#202124}.kg-body .mock-ribbon{position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap;padding:0;border:0}.kg-shell{grid-template-columns:256px minmax(0,1fr);min-height:100vh}.kg-sidebar{top:0;height:100vh;padding:18px 24px;border-right:1px solid #e0e3e7}.kg-sidebar-top{height:44px;margin:0 0 30px;gap:24px}.kg-sidebar-top button{font-size:22px}.kg-wordmark{font-size:30px;letter-spacing:0}.kg-create{width:138px;height:50px;margin:0 0 24px -18px;gap:12px;font-size:14px;box-shadow:0 2px 7px rgba(60,64,67,.22)}.kg-create span{font-size:34px}.kg-primary-nav{gap:8px;padding-bottom:24px}.kg-primary-nav a,.kg-work a{height:36px;gap:20px;font-size:15px;border-radius:8px}.kg-primary-nav span{width:24px;font-size:16px}.kg-work{padding-top:24px}.kg-work h2{font-size:16px;margin:0 0 14px}.kg-work h3{font-size:15px;margin:18px 0 10px}.kg-thumb{width:26px;height:26px;font-size:14px}.kg-main{min-width:0}.kg-topbar{height:64px;padding:8px 16px 0;display:grid;grid-template-columns:minmax(262px,1fr) minmax(0,1200px) minmax(80px,1fr) auto;align-items:start;gap:18px}.kg-search{grid-column:2;height:48px;max-width:none;width:100%;flex:none;margin-left:0;padding:0 26px;gap:16px}.kg-search span{font-size:24px}.kg-search input{font-size:14px}.kg-avatar{grid-column:4;width:40px;height:40px;border-width:2px;margin-left:0}.kg-hero{display:grid;grid-template-columns:minmax(0,1fr) 280px;grid-template-rows:auto auto;column-gap:24px;row-gap:28px;max-width:1200px;margin:34px auto 0;padding:0}.kg-dataset-copy{grid-column:1;grid-row:1/3}.kg-author{height:34px;margin:0 0 56px;font-size:11px;letter-spacing:.08em;line-height:1}.kg-avatar.small{width:32px;height:32px;font-size:17px;margin-right:16px}.kg-hero h1{font-size:36px;line-height:1.18;max-width:860px;margin:0 0 14px;font-weight:800}.kg-hero p:not(.kg-author){font-size:16px;line-height:1.42;max-width:760px}.kg-hero-actions{grid-column:2;grid-row:1;gap:14px;align-self:start;justify-self:end;margin-top:0}.kg-hero-actions button,.kg-hero-actions a{height:36px;font-size:14px;font-weight:700;padding:0 16px;gap:9px}.kg-score{height:36px!important}.kg-score.active{background:#f8f9fa}.kg-score span{width:44px}.kg-score strong{padding:0 13px}.kg-download{padding:0 18px!important}.kg-medal{width:18px!important;height:18px!important}.kg-hero-actions [data-kg-more]{width:24px!important;font-size:24px}.kg-cover{grid-column:2;grid-row:2;width:280px;min-height:140px;justify-self:end;border-radius:12px;padding:20px}.kg-cover strong{font-size:22px;line-height:1.1}.kg-cover span{font-size:13px}.kg-tabs{max-width:1200px;height:64px;margin:8px auto 0;padding:0;border-bottom:1px solid #dadce0;gap:24px}.kg-tabs a{height:100%;font-size:16px;font-weight:400;border-bottom-width:4px}.kg-tabs a.active{font-weight:500}.kg-content-grid{max-width:1200px;margin:0 auto;display:grid;grid-template-columns:minmax(0,950px) 226px;gap:24px;padding:36px 0 88px}.kg-article{border:0;padding:0}.kg-article h2{font-size:24px;margin:0 0 42px}.kg-article h3{font-size:14px;margin:22px 0 6px}.kg-article p{font-size:15px;line-height:1.45;margin:0 0 18px;color:#3c4043}.kg-article-image{height:180px;margin:32px 0 34px;border-radius:0;background:radial-gradient(circle at 58% 72%,#ffe9a8 0 70px,transparent 72px),radial-gradient(circle at 46% 10%,#b31389 0 42px,transparent 43px),radial-gradient(circle at 75% 0%,#f7669f 0 66px,transparent 67px),linear-gradient(180deg,#e54398,#fbd6df);display:flex;align-items:flex-start;justify-content:center;overflow:hidden;color:#fff}.kg-article-image span{transform:translateY(104px) rotate(-22deg);font-size:22px;font-weight:800;opacity:.9}.kg-view-more{border:0;background:transparent;font:inherit;font-size:14px;font-weight:700;color:#202124;padding:0;margin:0 0 76px 12px;cursor:pointer}.kg-meta{border:0;padding:0}.kg-meta section{border:0;padding:0;margin:0 0 28px}.kg-meta h2{font-size:18px;margin:0 0 7px}.kg-meta strong,.kg-meta p,.kg-meta a{font-size:16px;color:#5f6368}.kg-tags{gap:8px}.kg-tags span{font-size:14px;padding:7px 12px}.kg-explorer-span{grid-column:1/-1;display:grid;grid-template-columns:minmax(0,950px) 226px;gap:24px;margin-top:24px}.kg-explorer-span>h2{display:none}.kg-data-explorer{display:grid;grid-column:1/-1;grid-template-columns:minmax(0,950px) 226px;gap:24px;margin:0}.kg-de-main{border-radius:6px}.kg-de-header{height:86px;padding:0 24px}.kg-de-header h3{font-size:22px}.kg-de-actions{gap:18px}.kg-de-actions a,.kg-de-actions button{font-size:26px}.kg-de-toolbar{height:66px;padding:0 24px}.kg-de-modes{gap:26px}.kg-de-modes button{font-size:16px;border-bottom-width:4px}.kg-de-column-count{font-size:14px;padding-bottom:22px}.kg-de-table-wrap{max-height:520px}.kg-de-table th,.kg-de-table td{min-width:220px;max-width:250px;padding:13px 20px}.kg-de-table th{height:126px}.kg-de-col-title strong{font-size:16px}.kg-de-table th em{font-size:13px}.kg-de-profile td{top:126px;height:104px}.kg-de-profile strong{font-size:24px}.kg-de-side{padding-top:0}.kg-de-side h3{font-size:22px;margin-bottom:12px}.kg-de-side>a{font-size:16px;margin-bottom:22px}.kg-de-file{height:34px;font-size:15px;margin-bottom:48px}.kg-de-side section{padding:28px 0}.kg-de-side h4{font-size:22px}.kg-de-side p{font-size:16px}.kg-social-proof,.kg-metadata-block,.kg-activity-block{grid-column:1/-1;border:0;padding:44px 0 0;background:#fff}.kg-social-proof h2,.kg-metadata-block h2,.kg-activity-block h2{font-size:22px;margin:0 0 18px}.kg-survey-grid{display:grid;grid-template-columns:1fr 1fr;gap:24px}.kg-survey-grid section{border:1px solid #e0e3e7;border-radius:8px;padding:18px}.kg-survey-grid h3{font-size:16px;margin:0 0 12px}.kg-survey-grid p{display:flex;justify-content:space-between;margin:10px 0;color:#5f6368}.kg-metadata-block button{width:100%;height:48px;border:0;border-top:1px solid #e0e3e7;background:#fff;text-align:left;font:inherit;font-size:15px;cursor:pointer}.kg-metadata-block button.open{background:#f8f9fa}.kg-metadata-block button span{display:inline-block;width:28px}.kg-activity-block{display:grid;grid-template-columns:1fr 1fr 1fr;gap:18px}.kg-activity-block h2{grid-column:1/-1}.kg-activity-block div{border:1px solid #e0e3e7;border-radius:8px;padding:16px}.kg-activity-block strong{display:block;font-size:15px}.kg-activity-block span{display:block;font-size:24px;font-weight:700;margin:8px 0}.kg-activity-block em{color:#5f6368;font-size:13px;font-style:normal}.kg-toast{position:fixed;right:24px;bottom:24px;z-index:60;background:#202124;color:#fff;border-radius:8px;padding:12px 16px;box-shadow:0 8px 24px rgba(60,64,67,.25);font-size:14px}@media(max-width:1200px){.kg-shell{grid-template-columns:1fr}.kg-sidebar{position:static;height:auto}.kg-topbar,.kg-hero,.kg-tabs,.kg-content-grid{max-width:none;margin-left:24px;margin-right:24px}.kg-topbar{grid-template-columns:1fr auto}.kg-search{grid-column:1}.kg-avatar{grid-column:2}.kg-hero,.kg-content-grid,.kg-explorer-span,.kg-data-explorer{grid-template-columns:1fr}.kg-dataset-copy,.kg-hero-actions,.kg-cover{grid-column:1;grid-row:auto;justify-self:start}.kg-de-side{display:none}}`;
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
  await write(outDir, "assets/styles.css", styles() + hfSpecificStyles() + kaggleSpecificStyles() + kaggleAlignmentStyles() + kaggleTabStyles() + kaggleExplorerStyles() + kaggleFidelityStyles(), files);
  await write(outDir, "manifest.json", JSON.stringify({ ...model, mockNotice: MOCK_NOTICE }, null, 2), files);
  for (const dataset of model.datasets) {
    await write(outDir, `hf/${dataset.slug}/index.html`, renderHf(model, dataset), files);
    await write(outDir, `hf/${dataset.slug}/data-studio/index.html`, renderHfDataStudio(model, dataset), files);
    await write(outDir, `hf/${dataset.slug}/files-and-versions/index.html`, renderHfFiles(model, dataset), files);
    await write(outDir, `hf/${dataset.slug}/community/index.html`, renderHfCommunity(model, dataset), files);
    await write(outDir, `kaggle/${dataset.slug}/index.html`, renderKaggle(model, dataset), files);
    await write(outDir, `kaggle/${dataset.slug}/code/index.html`, renderKaggle(model, dataset, "code"), files);
    await write(outDir, `kaggle/${dataset.slug}/discussion/index.html`, renderKaggle(model, dataset, "discussion"), files);
    await write(outDir, `kaggle/${dataset.slug}/suggestions/index.html`, renderKaggle(model, dataset, "suggestions"), files);
    for (const file of dataset.files) {
      await copyDownload(outDir, dataset, file, options, files);
    }
  }
  return { outDir, files };
}
