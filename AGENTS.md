# AGENTS.md

Guidance for AI coding agents working in this repository.

## What this is

The personal photography portfolio of Paul Isaris, served at <https://paulisaris.com>. It is a
fully **static** [Astro 5](https://astro.build) site (no SSR, no server, no database). It has:

- **Albums** — curated photo projects (currently `NOPLACE` and `Underlight`). Each album
  combines a photo collection, bilingual texts (English / Greek), YouTube links and an on-site
  page-turning **flipbook** of the printed photobook.
- **Gallery / collections** — justified photo grids with a lightbox, one page per collection,
  plus `/collections/` with every photo.
- **Posts** — a small Markdown/MDX blog with an RSS feed.
- **About** page, home page (hero + featured grid + album cards), custom 404.
- Heavy **SEO** work: canonical URLs, Open Graph/Twitter tags, schema.org JSON-LD, sitemap,
  a Google image sitemap and a generated `robots.txt`.

The project started from the MIT-licensed
[astro-photography-portfolio](https://github.com/rockem/astro-photography-portfolio) theme and
was extended with posts, albums, flipbooks and SEO.

## Tech stack

| Concern         | Tool                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| Framework       | Astro 5 (static output to `dist/`), TypeScript (strict)                   |
| Content         | Astro content collections (`posts`, `albums`) with Zod schemas; MDX       |
| Styling         | Tailwind CSS 4 via `@tailwindcss/vite`, `@tailwindcss/typography`         |
| Images          | `astro:assets` + Sharp (WebP at build time)                               |
| Client JS       | Plain TS modules in `src/scripts/`; Alpine.js (CDN) for the navbar only   |
| Photo layout    | `justified-layout` + `glightbox` lightbox                                 |
| Flipbook        | `page-flip` (StPageFlip) in a `<dialog>`                                  |
| Tooling scripts | `tsx`, `commander`, `exifr`, `fast-glob`, `pdf-to-img`, `sharp`           |
| Tests           | Vitest                                                                    |
| Lint / format   | ESLint 9 (flat config), Prettier 3, pre-commit                            |
| Runtime         | Node 26 (`.nvmrc`); `.npmrc` sets `ignore-scripts`, `engine-strict`       |
| Hosting         | DigitalOcean App Platform static site, deployed from the `release` branch |

All npm packages except the three Astro integrations are `devDependencies`. This is correct for
a static build — do not move them.

## Commands

```bash
npm install
npm run dev        # dev server on http://localhost:4321 (drafts visible)
npm run build      # production build into dist/ (drafts hidden)
npm run preview    # serve dist/
npm test           # vitest (watch mode); use `npx vitest run` for a single run
npm run lint       # eslint over .ts/.js/.astro
npm run typecheck  # astro check (TypeScript diagnostics for .astro and .ts)
npm run format     # prettier --write . (skips .astro, see below)
npm run generate   # rebuild src/gallery/gallery.yaml from images in src/gallery/
npm run flipbook   # render flipbooks-src/*.pdf into public/flipbooks/ + src/data/flipbooks.json
```

CI (`.github/workflows/ci.yml`) runs on PRs and on pushes to `main`. It has four parallel
jobs: `lint` (the pre-commit hooks: whitespace, YAML check, Prettier, ESLint), `typecheck`
(`astro check`), `test` (`npm test`) and `build-check` (`npm run build`, output discarded;
it only proves the build succeeds). A fifth job, `ci` ("CI"), succeeds only when all four
succeed. It is the one check that the `main-branch-protection` ruleset requires, so add any new
job to its `needs` list. `dependabot_auto_merge.yml` enables auto-merge for minor and patch
Dependabot PRs; majors stay manual. The Node version comes from `.nvmrc`. Run
`npx vitest run`, `npm run lint`, `npm run typecheck` and `npm run build` before you say a
change is done. Run them on the Node version in `.nvmrc` (`nvm use`): some failures appear only
on Node 26, for example the `exifr` workaround in `galleryEntityFactory.ts`.

## Repository layout

```
site.config.mts            Owner name, title, hero/SEO/profile images, social links
astro.config.mts           `site` URL, MDX + sitemap integrations, Tailwind Vite plugin
tailwind.config.js         Theme tokens (fonts, HSL colour variables)
.do/app.yaml               Reference copy of the DO App Platform spec (NOT read on deploy)
DEPLOYMENT.md              Hosting / domain migration plan (DigitalOcean)
public/                    Served verbatim: favicons, images/profile.webp, images/seo.jpg,
                           flipbooks/<id>/page-NNN.webp (generated, committed)
src/
  content.config.ts        Zod schemas for the `posts` and `albums` collections
  content/
    about.md               About page body (imported directly, not a collection)
    albums/*.mdx           One file per album (frontmatter + <AlbumText> blocks)
    posts/*.md(x)          Blog posts
  gallery/
    gallery.yaml           Photo + collection metadata (source of truth for photos)
    <collection>/*.jpg     Original photos, one folder per collection
    featured/*.jpg         Photos for the built-in `featured` collection (home page)
  data/
    galleryData.ts         Types (GalleryData, Collection, GalleryImage, Image) + YAML loader
    imageStore.ts          Build-time photo API: getImages, getCollections, getHeroImage, …
    galleryEntityFactory.ts  Builds gallery entries from files (title from filename, EXIF)
    gallery-generator.ts   CLI behind `npm run generate`
    flipbook-generator.ts  CLI behind `npm run flipbook`
    flipbooks.json         Generated manifest: flipbook id -> page count + leaf size
    jsonld.ts              schema.org builders (Person, WebSite, ImageGallery, BlogPosting, …)
    __tests__/             Vitest tests + fixture galleries
  layouts/
    MainLayout.astro       HTML shell: <head> SEO/OG tags, fonts, NavBar, Footer, Alpine CDN
    PostLayout.astro       Post article layout on top of MainLayout
  pages/
    index.astro            Home: Hero, FeaturedGallery, AlbumsShowcase
    about.astro, 404.astro
    albums/index.astro, albums/[...album].astro
    collections/[...collection].astro   `/collections/` and `/collections/<id>/`
    posts/index.astro, posts/[...slug].astro
    rss.xml.ts, robots.txt.ts, image-sitemap.xml.ts   Endpoints
  components/              NavBar, Footer, Hero, FeaturedGallery, AlbumsShowcase, PhotoGrid,
                           Flipbook, AlbumText, YouTubeLink, SocialIcon, JsonLd
  scripts/                 Client-side TS: photo-grid.ts (layout + lightbox), flipbook.ts
  styles/                  global.css (Tailwind entry, CSS variables), glightbox-custom.css
  types/page-flip.d.ts     Type shim for page-flip
```

## Architecture

### Photo pipeline (custom, not a content collection)

1. Original images live in `src/gallery/<collection>/`.
2. `npm run generate` scans them and **merges** the result into `src/gallery/gallery.yaml`.
   New images get a title derived from the filename, a collection from their folder, and EXIF
   data. For existing images it refreshes only `exif`. Hand-edited `title`, `description` and
   `collections` stay as they are. It never removes entries.
3. At build time `imageStore.ts` loads the YAML (`galleryData.ts#loadGallery`). It validates
   that every `meta.collections` id exists in `collections` or is the built-in `featured`. Then
   it maps each entry to an Astro `ImageMetadata` through
   `import.meta.glob('/src/**/*.{jpg,jpeg,png,gif}', { eager: true })`. A YAML entry without a
   file logs a `[WARN]` and is skipped. It does not fail the build.
4. Pages and components call `getImages({ collection })`, `getCollections()`,
   `getImageByPath(path)` and `getHeroImage(heroPath)`. These run only at build time.

Paths in `gallery.yaml`, `site.config.mts#heroImage` and album `cover` fields are
**gallery-relative** POSIX paths such as `noplace/Project_2026_021.jpg`.

`featured` is a built-in collection id (`featuredCollectionId`). It does not need a
`collections` entry and has no `/collections/featured` page. The home page hero comes from
`site.config.heroImage`, or from the first featured image when `heroImage` is empty.
`FeaturedGallery` shows the other featured images. Both use `getHeroImage` so that they agree on
which image is the hero.

### Content collections

Defined in `src/content.config.ts` with the `glob` loader:

- `posts` — `title`, `description`, optional `seoDescription`, `date`, optional `cover`
  (a real image relative to the post file), `coverAlt`, `tags`, `draft`.
- `albums` — `title`, `description`, optional `seoDescription`, `galleryCollection` (id of a
  collection in `gallery.yaml`), `cover` (gallery-relative path), `order`, `videos[]`
  (`lang: en|el`, `url`), `pdfs[]` (`lang`, optional `flipbook` id, optional fallback `url`,
  `label`), `draft`.

An album is the bridge between the two systems. `galleryCollection` selects its photo grid from
`gallery.yaml`. The MDX body holds `<AlbumText lang="en|el">` blocks, which render side by side.

**Drafts:** every listing (pages, nav, album cards, image sitemap) filters with
`import.meta.env.PROD ? !data.draft : true`. Drafts show in `npm run dev` and are hidden in
production. The RSS feed always excludes drafts. Use the same filter for any new listing.

### Flipbooks

`npm run flipbook` reads `flipbooks-src/<id>.pdf` (git-ignored, local only). It renders each
page and splits two-page spreads into single leaves. Covers are trimmed and letterboxed. The
output is `public/flipbooks/<id>/page-NNN.webp` (committed) plus an update to
`src/data/flipbooks.json`. Per-book options go in an optional
`flipbooks-src/flipbooks.config.json` (`layout: spreads|single`, `frontCover`, `backCover`).
The album page reads the manifest. If an album's `pdfs[].flipbook` id is in the manifest, the
page renders `<Flipbook>`. If not, it falls back to a plain link to `url`. `src/scripts/flipbook.ts`
creates the StPageFlip instance lazily when the dialog opens. The zero-padding of page file names
must match in the generator and in the client script.

### Client-side JavaScript

Keep client JS minimal. The pattern is one TS module per feature in `src/scripts/`, imported
from a `<script>` tag in its component (Astro bundles it):

- `photo-grid.ts` — computes a justified layout for `PhotoGrid` and binds GLightbox.
- `flipbook.ts` — flipbook dialog behaviour.
- `FeaturedGallery.astro` has its own inline GLightbox setup.
- `NavBar` uses Alpine.js (`x-data`), loaded from unpkg in `MainLayout`.

### SEO

- `MainLayout` builds `<title>` as `"<title> · <owner>"` (or `fullTitle` for the home page),
  the meta description, the canonical URL, and the OG/Twitter tags. The social image falls back
  in this order: page `image` → `site.config.seoImage` → `heroImage` → first featured image.
- Pages add JSON-LD with `<JsonLd slot="head" schema={...} />` and the builders in
  `src/data/jsonld.ts`. The builders take `Astro.site` so that URLs become absolute.
- Use `imageAlt(image)` for alt text and captions. It uses `description || title`. Keep `||`
  here, because unwritten descriptions in the YAML are `null` or `''`.
- Prefer `seoDescription ?? description` for meta descriptions. Album and post descriptions
  are often long prose.
- Collection pages suffix the title with `— Photographs`. An album and a collection can share a
  name, and two pages must not have the same `<title>`.
- `image-sitemap.xml.ts` is a separate endpoint, because it needs `astro:assets#getImage`. That
  module is not available in `astro.config`. `customSitemaps` links it into
  `sitemap-index.xml`. **Its `getImage()` options (`quality: 90`, `format: 'webp'`, original
  width/height) must stay identical to the `<Image>` props in `PhotoGrid.astro`.** If they
  differ, the sitemap lists image URLs that no page uses.
- `robots.txt` and `rss.xml` are endpoints that derive URLs from `site`. RSS, the sitemap and the
  image sitemap return 404 or stay off when `site` is unset.

### Deployment

- Branch model: work on feature branches → `main` (integration) → merge `main` into `release`
  to publish. DigitalOcean App Platform auto-builds `release` (`npm run build` → `dist/`) and
  serves `paulisaris.com`. `www` redirects to the apex with a 301.
- `.do/app.yaml` is a **reference copy only**. DO does not read it. Change the live spec in the
  DO control panel or with `doctl`, then update this file by hand.
- Do not push to `release` unless the user explicitly asks. A push to `release` publishes the
  live site.

## Conventions and gotchas

- **Formatting:** Prettier uses 4-space indentation, single quotes, trailing commas and
  `printWidth` 100. **`.astro` files are excluded from Prettier** (`.prettierignore`), because a
  broken `prettier-plugin-astro` once replaced every `.astro` file with an empty stub. Do not
  run Prettier on `.astro` files and do not remove that exclusion. `.astro` files use **tab**
  indentation. Match the surrounding file by hand.
- Import the site config as `'../../site.config.mts'`, its real file name. Do not import
  TypeScript sources through `.mjs`/`.js` aliases. Other modules are imported either without an
  extension (`'../data/imageStore'`) or with `.ts`. Match the file you edit.
- Internal links use `import.meta.env.BASE_URL` as a prefix (`${base}collections`). Keep this
  pattern, even though the site is currently served at the domain root.
- Comments in this codebase explain **why** (constraints, past bugs, SEO reasons). Keep that
  standard. Do not delete an existing "why" comment unless its reason no longer applies.
- To add a photo collection: add the folder under `src/gallery/`, run `npm run generate`, then
  edit `gallery.yaml` (titles, descriptions, collection `name`/`description`). Review the diff.
  The generator also creates collection entries from folder names, so a run can add an unwanted
  `featured` entry to `collections`. Remove it, because `featured` is built in. The content
  integrity test fails until you do.
- To add an album: create `src/content/albums/<id>.mdx` with frontmatter that matches the schema.
  Its `galleryCollection` must be an existing collection id. Its `cover` must be a path that
  exists in `gallery.yaml`.
- To add a post: create `src/content/posts/<slug>.md` or `.mdx`. Put a cover image next to the
  file.
- `sortImages` in `imageStore.ts` sorts the loaded array in place. It supports only
  `sortBy: 'captureDate'`.
- Tests in `src/data/__tests__/` use fixture YAML files and images under
  `src/data/__tests__/gallery/`. `gallery.yaml` in that folder is git-ignored, because the
  generator tests write it.
- `contentIntegrity.test.ts` is different: it checks the **real** content. It fails when a
  `gallery.yaml` entry has no file (the build only warns and drops the photo), when a photo
  file has no `gallery.yaml` entry, when an album references a missing collection, cover or
  flipbook, when a flipbook's page files do not match `flipbooks.json`, or when
  `heroImage`/`seoImage` in `site.config.mts` point nowhere. If it fails after a content
  change, fix the content, not the test. It stubs `lucide-astro` with `vi.mock`, because
  Vitest cannot load `.astro` files.
- Large binaries: photos in `src/gallery/` are committed. The pre-commit large-file check
  excludes that folder. Flipbook source PDFs are never committed.
- `DEPLOYMENT.md` was written as a migration plan. Its references to
  `.github/workflows/deploy.yml` (GitHub Pages) are historical, and that file no longer exists.

## Git

- `main` is the default branch. `release` is the production branch.
- Commit messages are short and lowercase in most commits (for example `seo`, `flipbooks`).
  Dependabot opens security-update PRs.
- Commit only when the user asks.
