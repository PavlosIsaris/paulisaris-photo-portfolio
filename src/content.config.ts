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

export const collections = { posts };
