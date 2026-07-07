import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import siteConfig from '../../site.config.mjs';

export async function GET(context: APIContext) {
	// The RSS feed needs an absolute site URL. It stays dormant until you set
	// `site` in astro.config, at which point this feed lights up automatically.
	if (!context.site) {
		return new Response('RSS feed is disabled until `site` is set in astro.config.', {
			status: 404,
		});
	}

	const posts = (await getCollection('posts', ({ data }) => !data.draft)).sort(
		(a, b) => b.data.date.valueOf() - a.data.date.valueOf(),
	);

	return rss({
		title: `${siteConfig.owner} — Posts`,
		description: 'Stories and notes from behind the lens.',
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.date,
			link: `/posts/${post.id}/`,
			categories: post.data.tags,
		})),
	});
}
