# 📸 Paul Isaris — Photography

A personal photography website: galleries/collections plus a posts (blog)
section. Static, fast, and fully under your control — built with
[Astro](https://astro.build), Tailwind CSS, and GLightbox.

## Quick start

```bash
npm install
npm run dev        # local dev at http://localhost:4321
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

## Where things live

| Path                       | What it is                                                  |
| -------------------------- | ----------------------------------------------------------- |
| `site.config.mts`          | Your name, title, favicon, profile image, social links      |
| `src/content/about.md`     | The About page text                                         |
| `src/gallery/<album>/`     | Photo albums — drop images here                             |
| `src/gallery/gallery.yaml` | Album + image metadata (titles, descriptions, collections)  |
| `src/content/posts/`       | Blog posts as Markdown / MDX                                |
| `src/content.config.ts`    | Schema for post frontmatter                                 |
| `src/layouts/`             | `MainLayout` (site shell + SEO) and `PostLayout`            |
| `src/components/`          | Nav, footer, gallery grid, hero — edit HTML/Tailwind freely |
| `astro.config.mts`         | Site config, integrations (MDX, sitemap)                    |

## Adding a photo album

1. Create a folder: `src/gallery/my-trip/` and drop your `.jpg`s in it.
2. Run `npm run generate` to (re)build `src/gallery/gallery.yaml` from the
   images — it also reads EXIF.
3. Edit `gallery.yaml` to set each image's `title`, `description`, and which
   `collections` it belongs to. Add a photo to the built-in **`featured`**
   collection to show it on the home page.
4. Images are optimized to WebP automatically at build time; click any photo to
   open it in the GLightbox viewer.

## Writing a post

1. Add a file: `src/content/posts/my-post.md` (or `.mdx` for embeddable
   components/HTML).
2. Fill in the frontmatter:

    ```yaml
    ---
    title: 'My post'
    description: 'One-line summary shown in the list and social previews.'
    date: 2026-07-06
    cover: ./my-cover.jpg # optional; place the image next to the .md file
    coverAlt: 'Alt text'
    tags: ['landscape']
    draft: false # true = hidden from production, visible in `npm run dev`
    ---
    ```

3. Write the body in Markdown below the frontmatter. It appears at
   `/posts/my-post` and in the list at `/posts`. See
   `src/content/posts/first-light.md` for a worked example, and `wip-draft.md`
   for a draft example.

## Deploying

The site is a static site on **DigitalOcean App Platform**, served at
[paulisaris.com](https://paulisaris.com). `www.paulisaris.com` redirects to the
apex domain.

1. Merge your work into `main`. GitHub Actions run the tests, the build, and the
   pre-commit checks on pull requests.
2. To publish, merge `main` into `release` and push:

    ```bash
    git checkout release
    git merge main
    git push
    ```

3. DigitalOcean builds `release` with `npm run build` and serves `dist/`. A push
   to `release` is the only thing that deploys the site.

`site` in `astro.config.mts` is set to `https://paulisaris.com`. It turns on the
sitemap (`/sitemap-index.xml`), the image sitemap, and the RSS feed (`/rss.xml`).

`.do/app.yaml` is a reference copy of the app spec. DigitalOcean does not read
it on deploy. See [DEPLOYMENT.md](DEPLOYMENT.md) for the full setup, the domain
configuration, and rollbacks.

## Built with

Astro · TypeScript · TailwindCSS · Sharp (image optimization) · GLightbox.

Based on the MIT-licensed
[astro-photography-portfolio](https://github.com/rockem/astro-photography-portfolio)
theme by rockem, adapted with a posts/blog section and host-agnostic config.
