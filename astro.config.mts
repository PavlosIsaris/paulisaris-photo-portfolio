import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// Canonical production URL — enables the sitemap + RSS feed.
const site = 'https://paulisaris.com';

// https://astro.build/config
export default defineConfig({
    site,
    integrations: [
        mdx(),
        sitemap({
            // The photo sitemap is built by src/pages/image-sitemap.xml.ts (it needs
            // `astro:assets`, which the config can't reach) and stitched into the index here.
            customSitemaps: [`${site}/image-sitemap.xml`],
        }),
    ],
    vite: {
        plugins: [tailwindcss()],
    },
});
