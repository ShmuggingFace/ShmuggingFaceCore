# ShmuggingFaceCore

ShmuggingFaceCore generates review-ready static minisites that mock dataset
release pages before a real Hugging Face or Kaggle publication. The goal is to
make pre-release review links feel realistic enough to catch copy, metadata,
preview, file, and download problems while making it unmistakable that reviewers
are looking at a mock.

The generated app has:

- a neutral landing page with two primary reviewer paths;
- a ShmuggingFace 😏 Hugging Face-style dataset page;
- a Shmaggle Kaggle-style dataset page;
- table previews, file lists, mock download links, metadata, and discussion
  affordances;
- a no-secrets static output that can be deployed to Cloudflare Pages.

Every generated page includes a prominent mock notice:

> This is a ShmuggingFace review mock. It is not Hugging Face, Kaggle, or a real
> dataset release.

## Quick Start

Reference consumer demo:
[`ShmuggingFace/silly-dataset-release-demo`](https://github.com/ShmuggingFace/silly-dataset-release-demo)
deploys to
<https://shmuggingface-silly-dataset-demo.pages.dev/>.

Create `shmuggingface.config.mjs` in a dataset-producing project:

```js
export default {
  site: {
    title: "Dataset Release Review",
    owner: "example-team",
    visibility: "Public mock demo",
  },
  datasets: [{
    title: "Sock Drawer Benchmark",
    owner: "laundry-labs",
    subtitle: "A mock classification dataset for matching clean socks.",
    description: "A fake release used to review copy and data previews.",
    license: "CC-BY-4.0 mock",
    task: "tabular-classification",
    tags: ["tabular", "synthetic", "mock-release"],
    files: [{ path: "data/train.csv", size: "18 KB", kind: "CSV", sourcePath: "data/train.csv" }],
    columns: ["sock_id", "pattern", "pair_probability"],
    rows: [{ sock_id: "sock-0001", pattern: "stripes", pair_probability: "0.98" }],
  }],
};
```

Then generate the static site:

```sh
npx @shmuggingface/core build --config shmuggingface.config.mjs --out dist
```

During local development from this repository:

```sh
npm run build:demo
```

## Cloudflare Pages

The generated `dist/` folder is static and can be uploaded directly:

```sh
wrangler pages deploy dist --project-name <cloudflare-pages-project> --branch main
```

Closed review links should be protected with Cloudflare Access at the Pages
hostname. This repository intentionally does not store Access policies, reviewer
emails, Cloudflare tokens, or provider payloads. Use provider-managed secrets in
GitHub Actions and local Wrangler auth for deployment.

## Download Backing

Every file listed in a dataset must have real backing:

- Use `sourcePath` for small files that should be copied into the generated
  static site. Paths are resolved relative to `shmuggingface.config.mjs`.
- Use `downloadUrl` for large files or externally stored files, such as Git LFS,
  S3/R2, GCS, Azure Blob, or a signed release asset.
- Optional `storage` and `downloadLabel` fields control how external links are
  described in the UI.

Example:

```js
files: [
  { path: "data/train.csv", size: "18 KB", kind: "CSV", sourcePath: "data/train.csv" },
  {
    path: "data/full.parquet",
    size: "8 GB",
    kind: "Parquet",
    storage: "Git LFS",
    downloadUrl: "https://github.com/org/repo/raw/main/data/full.parquet",
    downloadLabel: "Open Git LFS",
  },
]
```

## GitHub Actions

Downstream projects can run the generator in CI and deploy with Wrangler:

```yaml
name: Deploy dataset release mock
on:
  workflow_dispatch:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      deployments: write
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm ci
      - run: npx shmuggingface build --config shmuggingface.config.mjs --out dist
      - uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name ${{ vars.CLOUDFLARE_PAGES_PROJECT }} --branch main
```

## Design Boundary

ShmuggingFaceCore is for review mocks, not impersonation. Generated sites should
be accurate enough for release review but must keep the mock brand, mock notice,
and non-production URLs visible.
