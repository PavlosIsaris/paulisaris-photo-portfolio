import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Blog posts live as Markdown/MDX files in src/content/posts/.
// Drop a new .md (or .mdx) file in there and fill in the frontmatter below.
const posts = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/posts' }),
    schema: ({ image }) =>
        z.object({
            title: z.string(),
            description: z.string(),
            // Publish date — controls ordering (newest first).
            date: z.coerce.date(),
            // Optional cover image, relative to the post file. Optimized at build.
            cover: image().optional(),
            coverAlt: z.string().optional(),
            tags: z.array(z.string()).default([]),
            // Set true to hide from production builds while you work on it.
            draft: z.boolean().default(false),
        }),
});

// Photo albums — curated projects that frame a gallery photo collection with
// 1–2 texts (EN/EL, authored in the MDX body), 1–2 YouTube videos and 1–2
// PDF-flip links. Drop a new .mdx file in src/content/albums/ to add one.
const albums = defineCollection({
    loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/albums' }),
    schema: z.object({
        title: z.string(),
        // Short summary used on the homepage/album cards and for SEO.
        description: z.string(),
        // id of an existing collection in src/gallery/gallery.yaml — its images
        // become this album's photo grid.
        galleryCollection: z.string(),
        // Gallery-relative path of the cover image (e.g. "noplace/Project_2026_021.jpg").
        cover: z.string(),
        // Controls ordering in the navbar dropdown and homepage (ascending).
        order: z.number().default(0),
        // 1 or 2 entries; a second entry is the other language's variant.
        videos: z
            .array(
                z.object({
                    lang: z.enum(['en', 'el']),
                    url: z.string().url(),
                    title: z.string().optional(),
                }),
            )
            .default([]),
        pdfs: z
            .array(
                z.object({
                    lang: z.enum(['en', 'el']),
                    // id of a flipbook generated under public/flipbooks/<id> (see
                    // `npm run flipbook`). When set, the album shows an on-site
                    // page-turning flipbook instead of a plain link.
                    flipbook: z.string().optional(),
                    // Optional external URL — used as the link/fallback when there is no
                    // flipbook (or its images haven't been generated yet).
                    url: z.string().url().optional(),
                    label: z.string().optional(),
                }),
            )
            .default([]),
        // Set true to hide from production builds while you work on it.
        draft: z.boolean().default(false),
    }),
});

export const collections = { posts, albums };
