import siteConfig from '../../site.config.mjs';
import type { Image } from './galleryData';

/**
 * Builders for the schema.org JSON-LD emitted via `<JsonLd />`.
 *
 * Every URL Google consumes must be absolute, so each builder takes the page's `site`
 * (i.e. `Astro.site`) and resolves against it. When `site` is unset the builders still
 * work — the URLs just stay relative, which is only ever the case in a dev build.
 */

const abs = (site: URL | undefined, path: string): string =>
    site ? new URL(path.replace(/^\//, ''), site).href : path;

/** Alt/caption text for a gallery photo. Descriptions in gallery.yaml are `null` or `''` when
 *  unwritten, so `||` (not `??`) is required to fall through to the title. */
export const imageAlt = (image: Pick<Image, 'title' | 'description'>): string =>
    image.description || image.title;

/** The photographer — the entity the whole site should resolve to in Google's knowledge graph. */
export const personSchema = (site: URL | undefined) => ({
    '@type': 'Person',
    '@id': `${abs(site, '/')}#person`,
    name: siteConfig.owner,
    url: abs(site, '/'),
    image: abs(site, `/images/${siteConfig.profileImage}`),
    jobTitle: 'Photographer',
    sameAs: siteConfig.socialLinks
        .filter((link) => !link.url.startsWith('mailto:'))
        .map((link) => link.url),
});

export const webSiteSchema = (site: URL | undefined) => ({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${abs(site, '/')}#website`,
    url: abs(site, '/'),
    name: siteConfig.owner,
    inLanguage: 'en',
    author: personSchema(site),
});

export const profilePageSchema = (site: URL | undefined) => ({
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    url: abs(site, '/about'),
    mainEntity: personSchema(site),
});

/** An ImageGallery whose `associatedMedia` makes each photo legible to Google Images. */
export const imageGallerySchema = (
    site: URL | undefined,
    { url, name, description, images }: GalleryArgs,
) => ({
    '@context': 'https://schema.org',
    '@type': 'ImageGallery',
    url: abs(site, url),
    name,
    description,
    author: personSchema(site),
    associatedMedia: images.map((image) => ({
        '@type': 'ImageObject',
        contentUrl: abs(site, image.contentUrl),
        name: image.name,
        ...(image.description ? { description: image.description } : {}),
    })),
});

interface GalleryArgs {
    url: string;
    name: string;
    description: string;
    images: { contentUrl: string; name: string; description?: string }[];
}

export const blogPostingSchema = (
    site: URL | undefined,
    { url, title, description, date, image, tags }: BlogPostingArgs,
) => ({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    '@id': abs(site, url),
    url: abs(site, url),
    headline: title,
    description,
    datePublished: date.toISOString(),
    author: personSchema(site),
    ...(image ? { image: abs(site, image) } : {}),
    ...(tags.length ? { keywords: tags.join(', ') } : {}),
});

interface BlogPostingArgs {
    url: string;
    title: string;
    description: string;
    date: Date;
    image?: string;
    tags: string[];
}

/** Breadcrumbs for nested pages, e.g. Home › Albums › NOPLACE. */
export const breadcrumbSchema = (
    site: URL | undefined,
    crumbs: { name: string; url: string }[],
) => ({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        name: crumb.name,
        item: abs(site, crumb.url),
    })),
});
