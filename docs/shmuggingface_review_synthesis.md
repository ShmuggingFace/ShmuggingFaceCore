# ShmuggingFaceCore Review Synthesis

Sources: Claude standard and adaptive thinking, ChatGPT standard and extended
thinking, Gemini standard and extended thinking, all dated 2026-05-25.

Goal: keep only upstream ShmuggingFaceCore framework findings. Downstream
LeadForge integration issues were extracted to
`/Users/shaypalachy/agents/handoffs/leadforge-v1-review/leadforge_shmuggingface_integration_issues.md`.
The immediate implementation sequence is tracked in
[`docs/next_10_review_prs.md`](next_10_review_prs.md).

---

## Framework Contract

### MEDIUM

**[MEDIUM-SF1] Core should make config validation explicit.**

The LeadForge review surfaced a broader framework-contract issue: downstream
config authors can emit stale, misspelled, or semantically inappropriate fields,
and Core currently has no explicit schema-validation boundary.

This should not block simple configs, but Core should either:

- reject unknown fields with a clear error;
- warn on unknown fields and continue; or
- expose a documented `meta` or `mockOnly` namespace for downstream-only
  annotations.

Current context: v1.0.1 does consume `descriptionHtml`, `coverImage`, `splits`,
`subsets`, `files[].about`, `downloads`, `likes`, `discussions`,
`kaggleUsability`, `kaggleMedals`, and `subtitle`. The remaining framework
question is not whether those fields are ignored, but how Core should protect
future integrations from silent config drift.

**[MEDIUM-SF2] Core should commit to a plain-data config contract.**

Downstream integrations can reasonably generate `shmuggingface.config.mjs`
programmatically from Python, Ruby, Go, shell scripts, CI jobs, or other release
pipelines. The current README examples use `export default <object>`, and
LeadForge implemented against that plain-data convention.

Core should document that a config may be a plain JSON-serializable object export
and that dynamic JavaScript expressions, imports, or runtime computation will not
be required for the default integration path. Dynamic JS can remain allowed as an
advanced option, but it should not become the only supported config shape without
a major-version break and migration path.

---

## Framework Feature Gaps

### MEDIUM

**[MEDIUM-SF3] Core needs either full-file profiling or explicit sample-only stats.**

Downstream integrations commonly pass only preview rows to Core. If Core computes
visible distributions from those rows, the Shmaggle explorer can make sample-only
distributions look like dataset-level summaries.

For high-fidelity review, Core should either:

- accept precomputed full-file profile stats;
- suppress Kaggle-style distribution summaries unless full-file stats are
  provided; or
- label those summaries as preview-sample summaries.

The LeadForge rebuttal sharpened this into two concrete framework requests:

- add a `profileStats` or equivalent config key for precomputed full-file
  statistics such as row count, unique counts, min/max, top values, and null
  rates;
- until that exists, label summaries computed from `rows` as sample-derived,
  including the sample size.

**[MEDIUM-SF4] The config model is still shallow for relational, multi-artifact datasets.**

The current config model is appropriate for reviewing presentation, copy, file
lists, table previews, discussions, and download affordances. It is less
expressive for relational, multi-artifact dataset families.

Likely v2 needs:

- table groups;
- per-file schemas;
- per-split row counts;
- column dtypes;
- platform-specific metadata validation hooks;
- nested docs and notebooks sections.

Core already supports file entries with `sourcePath` and `downloadUrl`, so this
is about higher-level semantics rather than basic download backing.

**[MEDIUM-SF5] The mock cannot represent the real Hugging Face Dataset Viewer.**

A reviewer checking the HF preview is checking layout, copy, metadata, and
mocked affordances, not the actual hosted Hugging Face Dataset Viewer behavior
over Parquet files.

A higher-fidelity v2 could validate HF YAML frontmatter and Parquet files against
what `datasets.load_dataset()` would produce, then surface warnings next to the
mock page.

**[MEDIUM-SF6] Fake community and activity widgets need clearer semantics.**

Core intentionally supports mock downloads, discussions, and other review
affordances. For pre-publication review, fake community/activity chrome can
still cause reviewers to evaluate nonexistent platform behavior.

The prominent mock notice is valuable and should stay. Core should also consider
neutralizing or labeling platform-computed values such as medals, community
counts, views, and downloads when they are mock-only.

The rebuttal specifically calls out `kaggleUsability` and `kaggleMedals`: because
they are exposed as first-class config fields, integrators can reasonably read
them as legitimate maintainer-controlled values. Core should remove these fields,
deprecate them, or document them as `mock-only` with a clear warning that real
review configs should not set platform-computed values.

---

## Good Patterns To Preserve

### LOW

**[LOW-SF1] The mock/review boundary is clear.**

The generated landing page and platform pages clearly state that the output is a
review mock, not Hugging Face, Kaggle, or a real release. Keep this boundary
prominent as fidelity improves.

**[LOW-SF2] The static generator remains easy to integrate.**

The current plain-data config and static output are good defaults for CI, local
preview, and Cloudflare Pages deployment. Preserve that low-friction path even
if richer validation hooks are added later.

---

## Summary

Highest-impact Core follow-ups:

1. Add explicit config validation or warnings for unknown fields.
2. Document the plain-data config contract for generated configs.
3. Add full-file `profileStats` support, or clearly mark sample-only summaries.
4. Expand the config model for relational, multi-artifact dataset families.
5. Add optional HF round-trip validation against real dataset artifacts.
6. Remove, deprecate, or clearly mark mock-only platform-computed fields such as
   `kaggleUsability` and `kaggleMedals`.

See [`docs/next_10_review_prs.md`](next_10_review_prs.md) for the ordered PR
queue that maps this synthesis and the LeadForge downstream handoff into the
next ten implementation slices.
