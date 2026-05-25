# Next 10 Review PRs

Status: immediate planning sequence
Last updated: 2026-05-25

This plan turns the synthesized ShmuggingFaceCore/LeadForge v1 feedback into the
next ten implementation PRs. It intentionally separates upstream Core framework
work from downstream LeadForge integration work while preserving the dependency
order between them.

Source docs:

- Core synthesis: [`docs/shmuggingface_review_synthesis.md`](shmuggingface_review_synthesis.md)
- LeadForge handoff:
  `/Users/shaypalachy/agents/handoffs/leadforge-v1-review/leadforge_shmuggingface_integration_issues.md`

## Immediate PR Queue

### PR 1: Core config contract and mock-only fields

Repository: `ShmuggingFace/ShmuggingFaceCore`

Scope:

- Document that `shmuggingface.config.mjs` may be a plain JSON-serializable
  object export.
- Add explicit config validation or warning behavior for unknown fields.
- Add a documented `meta` or `mockOnly` namespace for downstream-only
  annotations if warning-only validation is chosen.
- Remove, deprecate, or clearly mark `kaggleUsability` and `kaggleMedals` as
  mock-only platform-computed fields.
- Update README examples and tests accordingly.

Addresses:

- `MEDIUM-SF1`
- `MEDIUM-SF2`
- `MEDIUM-SF6`
- `HIGH-LF4` framework rebuttal

Acceptance:

- Unknown or deprecated fields produce deterministic behavior.
- README states the plain-data config contract.
- Real review config examples do not encourage maintainer-authored Kaggle
  medals/usability scores.

### PR 2: Core profile stats and sample labeling

Repository: `ShmuggingFace/ShmuggingFaceCore`

Scope:

- Add a `profileStats` or equivalent config field for full-file statistics.
- Support at least row count, per-column unique counts, null rates, min/max, and
  top values.
- Teach the Shmaggle Data Explorer to prefer `profileStats` over stats computed
  from `rows`.
- When stats are computed from `rows`, label them as sample-derived and include
  the sample size.
- Add tests for both `profileStats` and sample-label fallback.

Addresses:

- `MEDIUM-SF3`
- `MEDIUM-LF7` framework rebuttal

Acceptance:

- A binary column never appears to have impossible dataset-level unique counts
  because only preview rows were supplied.
- Generated UI distinguishes full-file profile stats from preview-sample stats.

### PR 3: Core relational artifact model

Repository: `ShmuggingFace/ShmuggingFaceCore`

Scope:

- Add config support for table groups, docs groups, notebook groups, and
  validation/manifest artifact groups.
- Add optional per-file schema metadata and column dtypes.
- Add per-split row count metadata independent of preview rows.
- Render grouped files clearly in the HF and Kaggle-style file surfaces.
- Preserve the existing flat `files` array as a backwards-compatible path.

Addresses:

- `MEDIUM-SF4`
- `HIGH-LF2` framework-adjacent support need

Acceptance:

- Relational, multi-artifact datasets can be represented without pretending to
  be a one-table toy dataset.
- Existing simple configs continue to generate the same surfaces.

### PR 4: Core Hugging Face validation hooks

Repository: `ShmuggingFace/ShmuggingFaceCore`

Scope:

- Add optional validation for Hugging Face-facing artifacts: README/YAML,
  Parquet files, split names, and `datasets.load_dataset()` compatibility where
  practical.
- Surface validation warnings in generated review output or build logs.
- Keep validation optional so static-only users are not forced into Python/HF
  dependencies.
- Document the validation path and its dependency boundary.

Addresses:

- `MEDIUM-SF5`

Acceptance:

- Downstream projects can opt into HF round-trip checks before publishing.
- Core still works as a lightweight static generator without validation extras.

### PR 5: LeadForge canonical metadata source

Repository: LeadForge downstream dataset repository

Scope:

- Generate or validate preview config from the same files used by real platform
  publication: `release/kaggle/dataset-metadata.json` and
  `release/huggingface/README.md`.
- Add a diff/lint step that fails when preview metadata disagrees with canonical
  platform artifacts.
- Ensure the review bundle contains enough per-tier inputs for offline agent
  reviewers to verify the script.

Addresses:

- `HIGH-LF1`

Acceptance:

- The preview can catch Kaggle/HF metadata bugs such as privacy, tags, task,
  license, split, and schema mismatches.

### PR 6: LeadForge full artifact listing

Repository: LeadForge downstream dataset repository

Scope:

- Include the full release artifact tree in the generated config: manifests,
  metrics, relational tables, docs, claims register, notebooks, validation
  artifacts, and platform cards.
- Use Core file grouping support if PR 3 is available; otherwise structure the
  flat file list consistently.
- Fix Kaggle/HF quick-start code snippets so they reference actual displayed
  and downloadable paths.

Addresses:

- `HIGH-LF2`

Acceptance:

- Reviewers see the real release bundle instead of a six-file subset.
- Quick-start examples are copy-pasteable against visible artifacts.

### PR 7: LeadForge dependency and release pin cleanup

Repository: LeadForge downstream dataset repository

Scope:

- Pin Core to `github:ShmuggingFace/ShmuggingFaceCore#v1.0.1` or the newer
  approved release if one exists by the time this PR runs.
- Regenerate `package-lock.json` without `git+ssh://`.
- Confirm CI/contributor installs work without GitHub SSH keys.

Addresses:

- `HIGH-LF3`
- `LOW-LF1`

Acceptance:

- `npm ci` works with HTTPS-accessible dependencies in CI.
- Downstream preview builds use the approved Core release.

### PR 8: LeadForge tier/card correctness and strict validation

Repository: LeadForge downstream dataset repository

Scope:

- Use each tier's `dataset_card.md` as that tier's main page body.
- Keep the global README as a separate release-overview artifact.
- Validate manifest and metrics shapes; remove silent defaults for critical
  fields.
- Reconcile the `split` column between `lead_scoring.csv`, feature dictionary,
  and preview text.
- Remove fabricated Kaggle usability/medal config values.

Addresses:

- `HIGH-LF4` integration side
- `MEDIUM-LF1`
- `MEDIUM-LF2`
- `MEDIUM-LF4`

Acceptance:

- Missing or malformed release metadata fails loudly.
- Tier pages are tier-specific.
- Public schema, preview text, and data files agree.

### PR 9: LeadForge link rewriting and generated-output tests

Repository: LeadForge downstream dataset repository

Scope:

- Fix relative Markdown link rewriting for bare relative paths, `../` paths,
  and GitHub blob links.
- Make the GitHub blob base configurable instead of hard-coded.
- Add direct tests for `scripts/build_shmuggingface_site.py`.
- Assert committed preview HTML matches generated output.
- Add generated-config syntax checks.

Addresses:

- `MEDIUM-LF3`
- `MEDIUM-LF5`
- `MEDIUM-LF6` integration side
- `LOW-LF2`

Acceptance:

- Broken static-preview links are caught before deploy.
- There is one tested preview-generation path.

### PR 10: LeadForge deploy hardening

Repository: LeadForge downstream dataset repository

Scope:

- Pin `wrangler` as a dev dependency.
- Default deploys to a preview branch unless explicitly publishing production.
- Read Cloudflare credentials from environment variables, with the personal env
  file only as a local fallback.
- Add clean-tree and cover-image-exists preflight checks.
- Capture and surface `stdout` and `stderr` from deployment commands.
- Preserve successful Wrangler deployment URLs in logs.

Addresses:

- `MEDIUM-LF8`
- `LOW-LF3`

Acceptance:

- CI and local deployments are reproducible.
- Production is not clobbered accidentally by whatever happens to be on disk.
- Cloudflare failures include enough output to debug.

## Dependency Notes

- PR 1 and PR 2 unblock cleaner downstream behavior and should be first.
- PR 3 improves PR 6 but does not need to block it; LeadForge can initially use
  the flat file list if needed.
- PR 4 is independent of the LeadForge integration fixes.
- PR 7 can happen at any point, but it is safer before any substantial
  downstream generated-output updates.
- PR 10 should come before any public production deploy of the real LeadForge
  review site.

