import type { APIContext } from 'astro';
import { getImage } from 'astro:assets';
import { getCollection } from 'astro:content';
import { getCollections, getImages } from '../data/imageStore';
import { imageAlt } from '../data/jsonld';
import type { Image } from '../data/galleryData';

/**
 * Google Images image sitemap.
 *
 * This lives as an endpoint rather than inside `sitemap()`'s `serialize` hook in astro.config,
 * because `<image:loc>` must point at the *same* URL the page embeds — the content-hashed
 * `/_astro/*.webp` produced by Astro's image pipeline. Only `getImage()` can resolve that, and
 * `astro:assets` is a virtual module that exists in the app's module graph, not in the config.
 * The file is stitched into `sitemap-index.xml` via the `customSitemaps` option.
 *
 * The transform params below MUST stay in sync with PhotoGrid.astro, otherwise Astro emits a
 * *second* derivative and the sitemap advertises an image no page actually references.
 */

/** Mirrors `<Image quality={90} format="webp" width={..} height={..} />` in PhotoGrid.astro. */
const resolveUrl = async (image: Image): Promise<string> => {
    const optimized = await getImage({
        src: image.src,
        quality: 90,
        format: 'webp',
        width: image.src.width,
        height: image.src.height,
    });
    return optimized.src;
};

const escapeXml = (value: string): string =>
    value.replace(
        /[<>&'"]/g,
        (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]!,
    );

interface PageEntry {
    path: string;
    images: Image[];
}

const renderImage = async (site: URL, image: Image): Promise<string> => {
    const loc = new URL(await resolveUrl(image), site).href;
    const caption = imageAlt(image);
    return [
        '    <image:image>',
        `      <image:loc>${escapeXml(loc)}</image:loc>`,
        `      <image:title>${escapeXml(caption)}</image:title>`,
        '    </image:image>',
    ].join('\n');
};

const renderPage = async (site: URL, page: PageEntry): Promise<string> => {
    const loc = new URL(page.path.replace(/^\//, ''), site).href;
    const images = await Promise.all(page.images.map((image) => renderImage(site, image)));
    return [`  <url>`, `    <loc>${escapeXml(loc)}</loc>`, ...images, `  </url>`].join('\n');
};

export async function GET({ site }: APIContext) {
    if (!site) {
        return new Response('Image sitemap is disabled until `site` is set in astro.config.', {
            status: 404,
        });
    }

    const collections = await getCollections();
    const albums = await getCollection('albums', ({ data }) =>
        import.meta.env.PROD ? !data.draft : true,
    );

    const pages: PageEntry[] = [
        { path: '/collections/', images: await getImages() },
        ...(await Promise.all(
            collections.map(async (collection) => ({
                path: `/collections/${collection.id}/`,
                images: await getImages({ collection: collection.id }),
            })),
        )),
        ...(await Promise.all(
            albums.map(async (album) => ({
                path: `/albums/${album.id}/`,
                images: await getImages({ collection: album.data.galleryCollection }),
            })),
        )),
    ];

    const body = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
        ...(await Promise.all(
            pages.filter((page) => page.images.length > 0).map((page) => renderPage(site, page)),
        )),
        '</urlset>',
        '',
    ].join('\n');

    return new Response(body, {
        headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    });
}
