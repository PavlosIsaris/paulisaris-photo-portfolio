import type { APIContext } from 'astro';

// Served as a real endpoint rather than a static public/robots.txt so the sitemap URL is
// derived from `site` in astro.config instead of being hardcoded here (and going stale).
// Note the file @astrojs/sitemap actually emits is `sitemap-index.xml`, not `sitemap.xml`.
export function GET({ site }: APIContext) {
    const lines = ['User-agent: *', 'Allow: /'];

    if (site) {
        lines.push('', `Sitemap: ${new URL('sitemap-index.xml', site).href}`);
    }

    return new Response(`${lines.join('\n')}\n`, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}
