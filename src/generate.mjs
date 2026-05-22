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
    ${tab("community", `${base}#community`, `🤗 Community <strong>${escapeHtml(dataset.discussions.length)}</strong>`)}
    ${tab("settings", `${base}#settings`, "⚙ Settings")}
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
      <section class="hf-card-markdown" id="settings">
        <h2>Settings</h2>
        <p>This mock settings tab is intentionally read-only. It exists so reviewers can verify the expected Hugging Face navigation target without changing a real release.</p>
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
body{background:#fff;color:#111827}.mock-ribbon{background:#111827;color:#fff;padding:7px 16px;font-size:14px;font-weight:700}.hf-topbar{position:sticky;top:0;height:56px;padding:0 6%;gap:14px;justify-content:flex-start;flex-wrap:nowrap;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 4px rgba(15,23,42,.05)}.brand{font-size:20px;color:#111827;white-space:nowrap}.brand-mark{font-size:28px}.global-search{width:min(420px,32vw);height:40px;border:1px solid #d8dee8;border-radius:9px;display:flex;align-items:center;gap:8px;padding:0 12px;color:#9aa3b2;background:#fff}.global-search input{border:0;outline:0;width:100%;font:inherit;font-size:15px;color:#111827}.global-search input::placeholder{color:#8b95a5}.global-nav{margin-left:auto;gap:14px;flex-wrap:nowrap}.global-nav a{font-weight:650;color:#111827;font-size:14px;white-space:nowrap}.global-nav strong{font-size:10px;color:#2563eb;background:#dbeafe;border-radius:4px;padding:2px 4px}.global-nav .avatar{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;border:1px solid #d8dee8;padding:0;flex:0 0 auto}main{max-width:none;padding:0}.hf-repo-hero{padding:54px 6% 34px;background:#fff;border-bottom:1px solid #eef0f4}.hf-title-row{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.hf-title-row h1{margin:0 12px 0 0;font-size:26px;line-height:1.25;font-weight:750;letter-spacing:0;display:flex;align-items:center;gap:8px}.hf-title-row h1 span{color:#98a1b2;font-weight:750}.hf-title-row h1 a{color:#374151;text-decoration:none;font-weight:450}.hf-title-row h1 strong{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:27px}.hf-muted-icon{font-size:17px;color:#c6ccd7}.copy-button{border:0;background:transparent;color:#6b7280;font-size:16px}.small-button,.count-pill{border:1px solid #d8dee8;background:#fff;border-radius:7px;padding:7px 10px;font:inherit;font-size:14px;color:#536073}.count-pill{background:#f8fafc}.hf-meta-grid{display:flex;gap:14px 20px;flex-wrap:wrap;margin-top:18px;max-width:1420px}.meta-line{display:flex;align-items:center;gap:8px;color:#98a1b2}.meta-line span{font-size:14px}.meta-line a{display:inline-flex;align-items:center;min-height:34px;padding:6px 12px;border:1px solid #e3e7ee;border-radius:9px;background:#fff;color:#374151;text-decoration:none;box-shadow:0 4px 12px rgba(15,23,42,.04);font-size:14px}.hf-tabs{height:58px;padding:0 6%;display:flex;align-items:end;gap:22px;border-bottom:1px solid #e5e7eb;background:#fff;overflow:auto}.hf-tabs a{height:100%;display:flex;align-items:center;gap:7px;color:#4b5563;text-decoration:none;font-size:17px;font-weight:520;white-space:nowrap;border-bottom:3px solid transparent}.hf-tabs a.active{color:#111827;font-weight:760;border-bottom-color:#111827}.hf-tabs span{font-size:11px;border:1px solid #e5e7eb;border-radius:7px;padding:1px 5px;color:#4f46e5}.hf-tabs strong{font-size:12px;color:#fff;background:#111827;border-radius:6px;padding:1px 5px}.hf-main-grid{display:grid;grid-template-columns:minmax(0,1fr) 530px;gap:0;max-width:1800px;margin:0 auto}.hf-content{border:0;border-radius:0;padding:32px 32px 56px 6%;background:#fff}.hf-sidebar{border:0;border-left:1px solid #e5e7eb;border-radius:0;padding:32px 6% 56px 32px;background:#fff}.dataset-viewer{border:1px solid #d8dee8;border-radius:10px;box-shadow:0 2px 8px rgba(15,23,42,.06);overflow:hidden;background:#fff}.dataset-viewer header{height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 16px;border-bottom:1px solid #e5e7eb;gap:12px}.dataset-viewer h2{margin:0;font-size:18px;white-space:nowrap}.viewer-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:flex-end}.viewer-actions a{color:#8b95a5;font-size:13px}.viewer-actions button,.sidebar-actions button{border:1px solid #d8dee8;background:#f8fafc;border-radius:7px;padding:7px 10px;font:inherit;font-size:13px;color:#374151}.viewer-splits{display:grid;grid-template-columns:1fr 1fr;border-bottom:1px solid #e5e7eb}.viewer-splits button{min-height:72px;border:0;border-right:1px solid #e5e7eb;background:#fff;text-align:left;padding:12px 16px;display:grid;grid-template-columns:1fr auto;gap:4px 10px;font:inherit}.viewer-splits button:last-child{border-right:0}.viewer-splits span{grid-column:1/-1;color:#687386;font-size:14px}.viewer-splits strong{font-size:15px}.viewer-splits em{font-style:normal;font-size:22px;align-self:center}.viewer-menu-row{display:grid;grid-template-columns:1fr 1fr;background:#fbfcfe;border-bottom:1px solid #e5e7eb}.viewer-menu{padding:10px 16px;display:flex;gap:8px;flex-wrap:wrap}.viewer-menu+ .viewer-menu{border-left:1px solid #e5e7eb}.viewer-menu button{border:1px solid #d8dee8;border-radius:999px;background:#fff;padding:6px 10px;font:inherit;font-size:13px}.viewer-search{height:48px;border-bottom:1px solid #e5e7eb;display:flex;align-items:center;gap:10px;padding:0 16px;color:#98a1b2}.viewer-search input{border:0;outline:0;width:100%;font:inherit;font-size:16px}.viewer-panels{border-bottom:1px solid #e5e7eb}.viewer-panel{padding:12px 16px;background:#f8fafc;color:#374151;font-size:13px}.viewer-panel code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.viewer-column-profile{padding:14px 16px;border-bottom:1px solid #e5e7eb;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.viewer-column-profile strong{display:block;font-size:15px}.viewer-column-profile span{color:#7b8494;font-size:14px;font-style:italic}.mini-histogram{height:42px;display:flex;align-items:end;gap:4px;margin-top:8px}.mini-histogram i{display:block;width:14px;background:#98a1b2;border-radius:2px 2px 0 0}.viewer-column-profile small{display:flex;width:176px;justify-content:space-between;color:#8b95a5}.hf-row-preview{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:15px;color:#1f2937}.preview-row{padding:14px 16px;border-bottom:1px solid #e5e7eb;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.preview-heading{background:#fbfcfe}.viewer-pagination{height:50px;display:flex;align-items:center;justify-content:center;gap:18px;color:#6b7280;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;border-top:1px solid #e5e7eb}.viewer-pagination button{border:0;background:transparent;color:#6b7280;font:inherit;cursor:pointer}.viewer-pagination button.active{border:1px solid #d8dee8;border-radius:10px;padding:6px 12px;color:#111827;background:#fff}.viewer-status{margin:0;padding:8px 16px;border-top:1px solid #e5e7eb;color:#687386;font-size:13px}.hf-card-markdown{margin-top:54px}.hf-card-markdown h2{font-size:24px;color:#263244}.hf-card-markdown p{font-size:16px;line-height:1.6;color:#374151}.sidebar-action-shell{position:relative;border-bottom:1px solid #eef0f4;padding-bottom:26px}.sidebar-actions{display:flex;gap:10px}.sidebar-actions .primary-action{background:#030712;color:#fff;border-color:#030712;min-width:210px;font-weight:700}.sidebar-popover{position:absolute;right:0;top:58px;z-index:4;width:min(460px,100%);border:1px solid #d8dee8;border-radius:10px;background:#fff;box-shadow:0 18px 40px rgba(15,23,42,.18);padding:16px}.sidebar-popover strong{display:block;font-size:17px;margin-bottom:12px}.code-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px}.code-tabs button{border:1px solid #d8dee8;border-radius:7px;background:#fff;padding:7px 10px;font:inherit;font-size:13px}.code-tabs button.active{background:#111827;color:#fff;border-color:#111827}.sidebar-popover pre{margin:0;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;padding:12px;overflow:auto}.sidebar-popover code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;white-space:pre}.locked-popover{background:repeating-linear-gradient(135deg,#fff,#fff 12px,#f8fafc 12px,#f8fafc 24px)}.locked-popover p{margin:0;color:#687386;line-height:1.45}.more-popover{width:260px;display:grid;gap:8px}.more-popover button{border:1px solid #e5e7eb;border-radius:7px;background:#f3f4f6;color:#9aa3b2;padding:9px 10px;text-align:left;font:inherit;text-decoration:line-through;cursor:not-allowed}.downloads-row{height:88px;border-bottom:1px solid #eef0f4;display:flex;align-items:center;justify-content:space-between;gap:20px}.downloads-row span{color:#667085;font-size:15px}.downloads-row span:after{content:"";display:inline-block;width:150px;border-bottom:1px dotted #d8dee8;margin-left:16px;vertical-align:middle}.downloads-row strong{font-size:19px}.hf-info-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;border-bottom:1px solid #eef0f4;padding:26px 0 28px}.hf-info-grid div{border:1px solid #e5e7eb;border-radius:9px;padding:10px 12px}.hf-info-grid dt{font-size:13px;color:#98a1b2;font-weight:650}.hf-info-grid dd{font-size:14px;color:#111827;margin-top:4px}.hf-info-grid a{color:#111827;text-decoration:none}.hf-info-grid a:hover{text-decoration:underline}.hf-side-section{border-bottom:1px solid #eef0f4;padding:24px 0}.hf-side-section h3{font-size:18px;margin:0 0 14px;color:#1f2937}.hf-files{list-style:none;margin:0;padding:0;display:grid;gap:10px}.hf-files li{border:1px solid #e5e7eb;border-radius:10px;padding:11px 12px;display:grid;grid-template-columns:1fr auto;gap:5px 10px}.hf-files span{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-weight:700}.hf-files strong,.hf-files em,.hf-files a{font-size:13px;color:#8b95a5}.hf-model-list{list-style:none;margin:0;padding:0;display:grid;gap:12px}.hf-model-list li{border:1px solid #e5e7eb;border-radius:10px;padding:12px;box-shadow:0 1px 4px rgba(15,23,42,.04)}.hf-model-list strong{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hf-model-list span{display:block;color:#98a1b2;font-size:13px;margin-top:5px}.hf-compact-header{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:0 6%;height:58px;border-bottom:1px solid #e5e7eb;background:#fff;overflow:hidden}.hf-compact-header .hf-title-row{min-width:0;flex:1;flex-wrap:nowrap;overflow:hidden}.hf-compact-header .hf-title-row h1{font-size:19px;min-width:0;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}.hf-compact-header .hf-title-row h1 strong{font-size:20px}.hf-compact-header .hf-title-row .small-button,.hf-compact-header .hf-title-row .count-pill{flex:0 0 auto}.hf-compact-header .hf-tabs{height:100%;padding:0;border-bottom:0;flex:0 0 auto;align-items:end}.hf-compact-header .hf-tabs a{font-size:16px}.data-studio-layout{display:grid;grid-template-columns:minmax(0,2fr) minmax(420px,1fr);gap:16px;padding:16px;background:#fff}.studio-viewer-column,.studio-agent-column{min-height:calc(100vh - 170px)}.studio-viewer-column .dataset-viewer{height:100%;border-radius:8px}.studio-dataset-viewer header{display:none}.studio-dataset-viewer .viewer-splits{border-top:0}.studio-dataset-viewer .hf-row-preview{font-size:14px}.studio-dataset-viewer .preview-row{padding:13px 14px}.studio-panel-actions{display:flex;gap:6px;margin-left:auto}.studio-panel-actions button{border:1px solid #d8dee8;background:#fff;border-radius:7px;padding:5px 8px;font:inherit}.studio-agent-column{position:relative;border:1px solid #d8dee8;border-radius:8px;background:#fff;padding:0;display:grid;grid-template-rows:auto 1fr auto;box-shadow:0 1px 4px rgba(15,23,42,.04)}.studio-agent-tabs{height:54px;display:flex;justify-content:center;gap:30px;border-bottom:1px solid #e5e7eb}.studio-agent-tabs button{border:0;background:transparent;font:inherit;color:#536073;padding:0 8px;border-bottom:3px solid transparent}.studio-agent-tabs button.active{color:#111827;font-weight:750;border-bottom-color:#111827}.studio-agent-tabs span{background:#e5e7eb;border-radius:5px;padding:2px 7px;font-size:12px;font-weight:800}.studio-agent-body{display:grid;place-items:center;padding:26px}.studio-agent-body pre{width:100%;align-self:start;margin:0;border:1px solid #e5e7eb;border-radius:8px;background:#f8fafc;padding:16px;overflow:auto}.studio-agent-body code{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px}.studio-agent-empty{text-align:center;max-width:560px;color:#687386}.studio-agent-empty strong{display:block;color:#111827;font-size:18px;margin-top:12px}.studio-agent-empty p{margin:10px 0 20px}.studio-agent-icon{width:42px;height:42px;border-radius:14px;background:#fee2e2;color:#ef4444;display:inline-grid;place-items:center;font-weight:900}.studio-split-pills{display:flex;gap:10px;flex-wrap:wrap;justify-content:center}.studio-split-pills button{border:1px solid #e5e7eb;background:#fff;border-radius:999px;padding:9px 16px;font:inherit;color:#4b5563;box-shadow:0 1px 3px rgba(15,23,42,.04)}.studio-split-pills button.active{border-color:#111827;color:#111827;background:#f8fafc}.studio-split-pills .more-splits{border-style:dashed}.studio-chatbar{margin:14px 16px 16px;border:1px solid #e5e7eb;border-radius:10px;box-shadow:0 2px 10px rgba(15,23,42,.08);padding:12px;display:grid;grid-template-columns:1fr auto auto;gap:10px;align-items:center}.studio-chatbar input{border:0;outline:0;font:inherit;color:#111827}.studio-chatbar input:disabled{background:#fff;color:#8b95a5}.studio-chatbar span{font-size:12px;color:#536073;border:1px solid #e5e7eb;border-radius:999px;padding:6px 9px}.studio-chatbar button{width:38px;height:38px;border:0;border-radius:999px;background:#a3a8b3;color:#fff;font-size:20px}.hf-files-page{max-width:1720px;margin:0 auto;padding:36px 6% 56px;background:#fff}.file-browser-toolbar{display:flex;align-items:center;gap:16px;margin-bottom:22px}.file-browser-toolbar button{border:1px solid #d8dee8;background:#fff;border-radius:10px;padding:10px 16px;font:inherit;color:#374151}.file-repo-name{font-size:20px;font-weight:650}.repo-size{border:1px solid #d8dee8;border-radius:8px;padding:6px 10px;color:#687386;background:#f8fafc}.contributors{margin-left:auto;display:flex;align-items:center;gap:7px;color:#536073}.contributors span{width:22px;height:22px;border-radius:999px;border:1px solid #fff;margin-left:-10px;background:#f8fafc;display:grid;place-items:center;font-size:12px}.contributors span:first-child{margin-left:0}.contributors strong{font-size:14px;font-weight:550}.files-menu-row{position:relative}.files-popover{position:absolute;z-index:5;right:0;top:-12px;width:260px;border:1px solid #d8dee8;border-radius:10px;background:#fff;box-shadow:0 18px 40px rgba(15,23,42,.16);padding:12px;display:grid;gap:8px}.files-popover button{border:1px solid #e5e7eb;border-radius:8px;background:#fff;padding:9px 10px;text-align:left;font:inherit}.files-popover button:disabled{color:#9aa3b2;text-decoration:line-through;background:#f3f4f6;cursor:not-allowed}.history-popover{right:210px}.history-popover strong{font-size:14px}.history-popover span{font-size:13px;color:#536073}.file-browser{border:1px solid #d8dee8;border-radius:10px;overflow:hidden;background:#fff}.commit-banner{height:56px;display:grid;grid-template-columns:auto auto auto minmax(0,1fr) auto auto;align-items:center;gap:10px;padding:0 18px;background:#fbfcfe;border-bottom:1px solid #e5e7eb}.commit-banner span{font-size:18px}.commit-banner strong{font-size:16px}.commit-banner em{font-style:normal;background:#fef3c7;color:#b45309;border-radius:6px;padding:3px 7px;font-size:12px;font-weight:750}.commit-banner code,.repo-file-row .file-message{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#8b95a5}.commit-banner kbd{border:1px solid #d8dee8;border-radius:6px;padding:4px 8px;background:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace}.commit-banner time,.repo-file-row .file-age{color:#8b95a5;white-space:nowrap}.repo-file-row{min-height:56px;display:grid;grid-template-columns:minmax(260px,1fr) 110px 42px minmax(260px,1fr) 150px;align-items:center;gap:12px;padding:0 18px;border-bottom:1px solid #e5e7eb}.repo-file-row:last-child{border-bottom:0}.repo-file-row.folder-row{grid-template-columns:minmax(260px,1fr) minmax(260px,1fr) 150px 42px}.file-name{font-weight:650;color:#111827;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.file-size{font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;color:#8b95a5;text-align:right}.file-download{width:28px;height:28px;border:1px solid #d8dee8;border-radius:7px;display:grid;place-items:center;text-decoration:none;color:#536073}.safe-pill{display:inline-flex;align-items:center;border:1px solid #d8dee8;border-radius:6px;padding:2px 5px;color:#8b95a5;font-size:12px;font-weight:650;margin-left:5px;background:#f8fafc}[hidden]{display:none!important}
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
    await write(outDir, `hf/${dataset.slug}/data-studio/index.html`, renderHfDataStudio(model, dataset), files);
    await write(outDir, `hf/${dataset.slug}/files-and-versions/index.html`, renderHfFiles(model, dataset), files);
    await write(outDir, `kaggle/${dataset.slug}/index.html`, renderKaggle(model, dataset), files);
    for (const file of dataset.files) {
      await copyDownload(outDir, dataset, file, options, files);
    }
  }
  return { outDir, files };
}
