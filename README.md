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

## Deploying (host not chosen yet)

The build is host-agnostic (root-domain). When you pick a host:

1. Set `site: 'https://yourdomain.com'` in `astro.config.mts`. This turns on the
   **sitemap** (`/sitemap-index.xml`) and the **RSS feed** (`/rss.xml`), which
   stay dormant until `site` is set.
2. Point the host at this repo with build command `npm run build` and output
   directory `dist/`. **Cloudflare Pages** is the recommended default (free,
   generous bandwidth for large photos); Netlify and GitHub Pages also work.
3. Note: the inherited `.github/workflows/deploy.yml` targets GitHub Pages with
   the old repo's base path — update or delete it to match your chosen host.

## Built with

Astro · TypeScript · TailwindCSS · Sharp (image optimization) · GLightbox.

Based on the MIT-licensed
[astro-photography-portfolio](https://github.com/rockem/astro-photography-portfolio)
theme by rockem, adapted with a posts/blog section and host-agnostic config.
