# ShmuggingFace / Integration — Review Synthesis
_Sources: Claude (standard + adaptive thinking), ChatGPT (standard + extended thinking), Gemini (standard + extended thinking), all dated 2026-05-25._
_Goal: de-duplicated, cross-pollinated, ordered HIGH → MEDIUM → LOW. All detail preserved._
_Coverage: `scripts/build_shmuggingface_site.py` (the LeadForge integration script), ShmuggingFaceCore (the upstream NPM framework), and the live preview site at `leadforge-lead-scoring-v1-preview.pages.dev`._

---

## Theme 1 — Preview Source Accuracy: The Preview Cannot Validate What It Claims To

### HIGH

**[HIGH-SF1] The preview is generated from different source files than the real Kaggle/HF metadata — so the review mock cannot surface the most important publish bugs.**

Claude (adaptive), Claude (standard), ChatGPT (standard and extended). Most sharply stated by Claude (adaptive):

`scripts/build_shmuggingface_site.py` builds each tier's config from `manifest.json`, `metrics.json`, `feature_dictionary.csv`, `lead_scoring.csv`, and the rendered `release/README.md`, and **hard-codes** the task (`tabular-classification`), license (`MIT`), splits, and tags list. It **never reads** `release/kaggle/dataset-metadata.json` or `release/huggingface/README.md` — the artifacts that actually drive the published pages. So the preview's "Kaggle" and "HF" tabs are ShmuggingFaceCore's synthesis, not a render of the real metadata. A reviewer checking "metadata accuracy, tags, task categories, license, split configs, column schema" on the preview is checking fabricated fields.

Consequences:
- The `isPrivate: true` bug in `dataset-metadata.json` (a Kaggle publish blocker) is invisible in the preview by construction.
- The divergent file tree between the Kaggle copy of the README and the canonical README is invisible.
- Tag mismatches across surfaces are invisible.

Fix: drive the preview from the same two metadata files the platforms consume (`release/kaggle/dataset-metadata.json` and `release/huggingface/README.md`), or add a diff/lint step that fails when preview fields disagree with those canonical artifacts.

Claude (standard) frames a related point: `load_tier` reads `tier_dir/metrics.json`, `tier_dir/manifest.json`, and `tier_dir/lead_scoring.csv` for `intro`/`intermediate`/`advanced`, none of which are in the foldermix (only the root `release/metrics.json` and per-tier READMEs ship). So the config the script produces cannot be verified against real inputs by an offline agent reviewer — which contradicts the README's "self-contained for AI review" claim. Ship at least one tier's per-tier bundle files in the reviewable artifact set.

**[HIGH-SF2] The integration script maps only 6 files into the preview, vastly underrepresenting the claimed self-contained release bundle.**

Claude (standard), ChatGPT (standard and extended). The HF-style preview lists only six downloadable files: `lead_scoring.csv`, `feature_dictionary.csv`, three task-split Parquet files, and `dataset_card.md`. But the dataset README claims a much richer self-contained release with manifests, metrics, relational tables, docs, claims register, notebooks, and validation artifacts. ShmuggingFaceCore supports real backing for every listed file via `sourcePath` or `downloadUrl`, so this is an integration-script omission, not a framework limitation. The Kaggle-style quick command also tells users to read `data/train.csv`, which is not the displayed file name.

ChatGPT (standard): "For a relational dataset, this makes the download experience misleading. A first-time Kaggle visitor would likely treat it as a one-table toy."

Claude (standard): `build_shmuggingface_site.py` constructs a six-file list — that is exactly what appears in the HF-style file listing. ShmuggingFaceCore supports file entries with backing sources, so this is an integration omission.

**[HIGH-SF3] The SSH dependency in `package-lock.json` will break any CI environment or contributor without SSH keys configured for GitHub.**

Gemini (extended). The `package-lock.json` resolves the `@shmuggingface/core` dependency using a strict `git+ssh://` protocol (`git+ssh://git@github.com/ShmuggingFace/ShmuggingFaceCore.git`). This will cause `npm install` to fail for any external contributor or CI environment without SSH keys. It must be switched to a standard `https://` repository URL for open-source viability.

Claude (standard and adaptive) also flag this at LOW: `package.json` declares `github:ShmuggingFace/ShmuggingFaceCore#v1.0.0` (which resolves as https), but the lockfile pins `git+ssh://`. Regenerating the lockfile would fix the discrepancy.

---

## Theme 2 — Integration Script Design & Correctness

### HIGH

**[HIGH-SF4] The integration script generates config fields that the framework appears to silently ignore — so the config-to-render contract is partly dead and unverifiable.**

Claude (standard). `make_dataset_config` emits `kaggleUsability`, `kaggleMedals`, `downloads`, `likes`, `discussions`, `coverImage`, and a rich `subtitle`, but the committed `kaggle.html`/`huggingface_*.html` do not surface the medal/usability/likes/downloads values. That means either ShmuggingFaceCore silently drops unknown keys (so the script is emitting dead config) or the previews are stale. ShmuggingFaceCore should either consume or explicitly reject unknown config keys so the contract is stated; the integration script should remove fields the framework provably ignores.

Claude (adaptive) notes the fabricated values specifically: `TIER_USABILITY = {intro: 9.4, intermediate: 9.1, advanced: 8.9}`, `TIER_MEDAL = {Gold, Silver, Bronze}`, and `downloads/likes = 0` are hard-coded. On real Kaggle, the usability score is computed by the platform and medals are earned through community engagement — not assigned by difficulty tier. These should be removed or clearly labeled as "placeholder: will be assigned by platform."

ChatGPT (extended) and Claude (standard) both independently rate the fabricated usability/medals at HIGH: presenting invented values trains the maintainer's eye to expect numbers that won't appear, and if any of this copy leaks into a real listing it could read as fabricated claims.

---

### MEDIUM

**[MEDIUM-SF1] `make_dataset_config`'s defaulting masks missing or malformed manifest fields instead of failing loud.**

Claude (standard). The function uses `manifest.get("n_leads", 5000)`, `manifest.get("snapshot_day", 30)`, and `manifest.get("tasks", {}).get(TASK, {})` with `train_rows/valid_rows/test_rows` defaulting to `0`. If a manifest is malformed or a key is renamed, the preview will silently show "5,000 leads" and "0 rows" splits. For a tool whose entire job is faithful preview, missing critical fields should raise. Also, `metrics.get("medians", {})` assumes the per-tier `metrics.json` has a top-level `medians` key, whereas the root `release/metrics.json` nests under `tiers.<tier>.medians` — if the per-tier files don't follow the flatter shape, every headline number on the preview silently becomes `0.0` / `~0%`. Validate the shape explicitly.

**[MEDIUM-SF2] The same `readme_html` is rendered as `descriptionHtml` for all three tier pages, weakening tier-specific presentation.**

ChatGPT (extended), Claude (adaptive). The script renders `release/README.md` once and passes the same `readme_html` into each tier config, so every tier page body shows the full cross-tier README rather than tier-specific copy. The per-tier `dataset_card.md` (which exists) is merely listed as a downloadable file, never used as the page body. For review fidelity, use the tier card as the main page body and include the global README as a separate release-overview file.

**[MEDIUM-SF3] The config-generation has several concrete correctness gaps.**

Claude (adaptive). Three specific issues:
1. `_rewrite_links` only handles `../`-prefixed links and one hard-coded validation path; bare relative links such as `[LICENSE](LICENSE)` are left relative (will 404 on a static host), and rewritten `.github/ISSUE_TEMPLATE/*.yml` links 404 if those files don't exist.
2. The same `readme_html` is used as `descriptionHtml` for all three tiers (also covered in SF2 above).
3. The `lead_scoring.csv` "about" text asserts a `split` column — which does exist in the CSV, but isn't in the feature dictionary, so the preview is more accurate than the canonical spec. Reconcile the two.

**[MEDIUM-SF4] The build script is untested, and it's unclear whether the committed HTML was produced by the current script or an older one.**

Claude (adaptive). There is no `tests/scripts/test_build_shmuggingface_site.py`, while the older `scripts/preview_hf_page.py` and `scripts/preview_kaggle_page.py` *are* tested (`test_preview_hf_page.py`, `test_preview_kaggle_page.py`). The repo therefore appears to carry two preview systems simultaneously. The brief states `release/_preview_committed/*.html` are "byte-exact renderings of the mock pages," but it's ambiguous whether those came from the tested per-page scripts or from the untested ShmuggingFaceCore build. Pin one path, test it, and add a check that the committed HTML matches the deployed build.

**[MEDIUM-SF5] Config generation uses static string-concatenation, which will break if the framework evolves to require dynamic JavaScript.**

Gemini. The script manually constructs `shmuggingface.config.mjs` by dumping a Python dictionary to JSON and prepending `export default`. If ShmuggingFaceCore ever requires dynamic JavaScript evaluations or module imports within its config, this static approach will break silently or with cryptic errors.

**[MEDIUM-SF6] ShmuggingFaceCore needs either full-file profiling or explicit "sample-only" stats — not sample stats presented as dataset-level summaries.**

ChatGPT (extended). The integration script reads the full CSV but passes only `df.head(8)` as `rows` to the config. ShmuggingFaceCore's documented config supports `columns` and `rows`, but not a separate full-file statistics payload. The result is visible in the Shmaggle explorer: stats appear computed from a tiny preview sample but are presented as dataset-level summaries (e.g., `converted_within_90_days` shows "136 unique values" — obviously wrong for a binary column). The framework should either accept precomputed profile stats, or suppress Kaggle-style distribution summaries unless they come from the full file.

---

## Theme 3 — Framework Design & Feature Gaps

### MEDIUM

**[MEDIUM-SF7] ShmuggingFaceCore's abstraction is too shallow for relational, multi-artifact datasets.**

ChatGPT (standard). The Core README describes a static minisite generator for HF/Kaggle-like pages with mock downloads, file lists, table previews, and discussions. That is appropriate for reviewing presentation, but the config model is not rich enough for a relational, multi-artifact dataset: it needs table groups, per-file schemas, per-split row counts, column dtypes, platform-specific metadata validation, and nested docs/notebooks sections. ShmuggingFaceCore supports file entries with `sourcePath`/`downloadUrl`, but the higher-level grouping semantics (flat CSV vs relational tables vs docs vs notebooks) are absent.

**[MEDIUM-SF8] The mock cannot represent the real HF dataset viewer — the single most-used element of a real HF dataset page — and fakes Kaggle chrome it shouldn't.**

Claude (standard). The framework currently fakes Kaggle usability/medals/discussion counts (which are platform-computed and cannot be set by a maintainer) and omits the element that matters most for HF: a real data viewer that parses Parquet and renders an interactive column-distribution table. A reviewer checking the HF preview is checking page layout and metadata, not the actual data-viewer experience a real visitor gets. A higher-fidelity v2 would drop the invented Kaggle chrome and instead validate the HF YAML frontmatter and Parquet against what `datasets.load_dataset()` would actually produce. The `[publish]` extra already pulls `datasets` for exactly this kind of round-trip — wire it into the preview build.

Gemini (extended): "The static preview site cannot faithfully represent... Hugging Face's Dataset Viewer (which renders Parquet column distributions)... If the dataset contains edge-case nulls or extreme Gaussian outliers, the mock site will not reveal how aggressively those anomalies will wreck the auto-generated platform visualizations."

**[MEDIUM-SF9] The mock-site fidelity is compromised by fake community and activity widgets.**

ChatGPT (standard). The framework intentionally supports mock downloads/discussions, but for pre-publication review those placeholders can cause reviewers to evaluate nonexistent platform behavior. Keep the prominent mock notice (it is well-done), but remove or clearly neutralize fake medals, fake discussions, fake views, and fake downloads.

---

### LOW

**[LOW-SF1] The `@shmuggingface/core` dependency pin is at v1.0.0; v1.0.1 was released 2026-05-24.**

ChatGPT (standard and extended). `package.json` pins `@shmuggingface/core` to `#v1.0.0`. The upstream repository shows `ShmuggingFaceCore v1.0.1` as the latest release. Pinning is good for reproducibility, but the release should either update to v1.0.1 or document why v1.0.0 is intentionally locked. The v1.0.1 release presumably contains the fix for the socks/laundry copy (finding P2 in the main synthesis).

**[LOW-SF2] `_rewrite_links` hardcodes the GitHub branch and org.**

Claude (standard). If the repo's default branch changes or the org is renamed (`leadforge-dev/leadforge` is referenced throughout), every preview link silently 404s. Read the base from config rather than the `GITHUB_BLOB_BASE` module constant.

**[LOW-SF3] Deployment error handling doesn't capture `stderr` into the Python exception output.**

Gemini. `deploy_site` shells out to `wrangler pages deploy` and catches non-zero exit codes, but doesn't explicitly capture and stream `stderr` logs into the exception output. This makes debugging Cloudflare deployment failures harder than necessary for a solo maintainer.

**[LOW-SF4] Good workflow ergonomics worth preserving.**

Claude (standard). `ensure_smf_core` has a sensible resolution order (`--smf-core` override → npm-pinned package) with an actionable error message. The README is rendered through a real markdown engine with `linkify` disabled (avoiding spurious autolinks). The script writes a deterministic `shmuggingface.config.mjs` as `export default {...}`. The mock notice boundary is well-done — the landing page and the ShmuggingFaceCore README both clearly state that generated pages are mocks, not real HF/Kaggle pages.

---

## Theme 4 — Deployment Workflow

### MEDIUM

**[MEDIUM-SF10] The deploy workflow pushes straight to the production slot with no preview-branch gate and suppresses dirty-tree warnings.**

All three models. Claude (standard and adaptive): `deploy_site` runs `wrangler pages deploy ... --branch main --commit-dirty=true`, deploying whatever is on disk directly to the public production URL with no staging/preview branch. The Cloudflare token is sourced from a hardcoded personal path (`~/.config/adanim/cloudflare_api_token.env`). `wrangler` is not declared in `package.json` — only `@shmuggingface/core` is — so deployment depends on an unpinned global binary.

ChatGPT (standard and extended): "For a solo maintainer today this works; the moment a second contributor or a CI job runs it, it either fails (no token at that path, no wrangler) or — worse — succeeds and clobbers production."

Gemini: the CI-oriented path in ShmuggingFaceCore's own README shows GitHub Actions with `npm ci`, build, and Wrangler deployment via repository secrets.

Recommended fixes: pin `wrangler` as a `devDependency`; default deploys to a preview branch rather than main; read the Cloudflare token from an environment variable (with the personal file as a local fallback); add a "clean tree + cover image exists" preflight check.

---

## Summary — Highest Priority Items (Consensus Across All Models)

**Release blockers (all HIGH, fix before any publish):**
1. Preview never reads `release/kaggle/dataset-metadata.json` / `release/huggingface/README.md` — so it cannot catch the `isPrivate: true` bug or tag/schema mismatches. Add a lint/diff step that compares preview config against canonical metadata.
2. Only 6 files in the preview file listing vs the full release artifact — integrate relational tables, docs, notebooks, manifests per the README's own claim.
3. `package-lock.json` pins `git+ssh://` — regenerate from the `github:` (https) spec so CI and contributors without SSH keys can `npm install`.
4. Fabricated Kaggle usability scores (9.4/9.1/8.9) and medals (Gold/Silver/Bronze) — remove; these values cannot be set by a maintainer and mislead reviewers.
5. Socks/laundry copy on the Shmaggle page — upstream ShmuggingFaceCore fix needed (awaiting v1.0.1); bump to v1.0.1 once released.

**High-impact framework improvements (MEDIUM, raise quality significantly):**
- Accept precomputed full-file stats so distribution summaries are dataset-level, not sample-level.
- Use per-tier `dataset_card.md` as each tier page's body rather than the global README.
- Make config schema validation explicit: reject or warn on unknown keys; raise on missing required fields rather than silently defaulting.
- Add a round-trip integration test for the build script.
- Invest in HF round-trip validation (the `[publish]` extra already pulls `datasets`) rather than fake Kaggle chrome.
