import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
	// Set `site` to your final domain when you deploy (enables the sitemap + RSS
	// feed). e.g. site: 'https://www.yourdomain.com'
	// Left unset for now so the build is host-agnostic (root-domain deploy).
	// The sitemap integration below stays dormant until `site` is set.
	integrations: [mdx(), sitemap()],
	vite: {
		plugins: [tailwindcss()],
	},
});
