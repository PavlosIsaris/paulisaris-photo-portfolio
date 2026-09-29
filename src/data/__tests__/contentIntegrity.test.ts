import { describe, expect, it, vi } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import * as yaml from 'js-yaml';
import siteConfig from '../../../site.config.mts';
import flipbooks from '../flipbooks.json';
import { loadGallery } from '../galleryData.ts';
import { featuredCollectionId } from '../imageStore.ts';

// site.config imports its icons from lucide-astro, which ships raw .astro files that Vitest
// cannot load. Only the config's image paths matter here.
vi.mock('lucide-astro', () => ({ Instagram: {}, Mail: {} }));

/**
 * Checks the real content of the repository, not fixtures. These are the mistakes the build
 * does not catch: imageStore only logs a warning for a gallery.yaml entry whose file is missing,
 * so the photo silently disappears from the site.
 */

const GALLERY_DIR = 'src/gallery';
const ALBUMS_DIR = 'src/content/albums';
const FLIPBOOKS_DIR = 'public/flipbooks';

const gallery = await loadGallery(path.join(GALLERY_DIR, 'gallery.yaml'));
const galleryPaths = new Set(gallery.images.map((image) => image.path));

// Same extensions as gallery-generator.ts, so "orphan" means "`npm run generate` would add it".
const photoFiles = await fg('**/*.{jpg,jpeg,png}', { cwd: GALLERY_DIR });

interface AlbumFrontmatter {
    galleryCollection: string;
    cover: string;
    pdfs?: { flipbook?: string }[];
}

const albums = fs
    .readdirSync(ALBUMS_DIR)
    .filter((file) => /\.mdx?$/.test(file))
    .map((file) => {
        const source = fs.readFileSync(path.join(ALBUMS_DIR, file), 'utf8');
        const frontmatter = source.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? '';
        return { file, data: yaml.load(frontmatter) as AlbumFrontmatter };
    });

const collectionIds = new Set([
    ...gallery.collections.map((collection) => collection.id),
    featuredCollectionId,
]);

describe('Content integrity', () => {
    describe('gallery', () => {
        it('has a file for every gallery.yaml entry', () => {
            const missing = [...galleryPaths].filter(
                (imagePath) => !fs.existsSync(path.join(GALLERY_DIR, imagePath)),
            );
            expect(missing).toEqual([]);
        });

        it('has a gallery.yaml entry for every photo file (run `npm run generate`)', () => {
            const orphans = photoFiles.filter((file) => !galleryPaths.has(file));
            expect(orphans).toEqual([]);
        });

        it('does not list the built-in featured collection under `collections`', () => {
            // gallery-generator.ts derives collections from folder names, so a run re-adds
            // src/gallery/featured/ as a regular collection and creates /collections/featured.
            const ids = gallery.collections.map((collection) => collection.id);
            expect(ids).not.toContain(featuredCollectionId);
        });
    });

    describe('albums', () => {
        it.each(albums)('$file uses an existing gallery collection', ({ data }) => {
            expect([...collectionIds]).toContain(data.galleryCollection);
        });

        it.each(albums)('$file has a cover that exists in gallery.yaml', ({ data }) => {
            expect([...galleryPaths]).toContain(data.cover);
        });

        it.each(albums)('$file only references generated flipbooks', ({ data }) => {
            const unknown = (data.pdfs ?? [])
                .map((pdf) => pdf.flipbook)
                .filter((id): id is string => id !== undefined && !(id in flipbooks));
            expect(unknown).toEqual([]);
        });
    });

    describe('flipbooks', () => {
        it.each(Object.entries(flipbooks))(
            '%s has as many page images as its manifest entry',
            (id, { pages }) => {
                const files = fg.sync('page-*.webp', { cwd: path.join(FLIPBOOKS_DIR, id) });
                expect(files).toHaveLength(pages);
            },
        );
    });

    describe('site config', () => {
        it('points heroImage at a gallery photo', () => {
            // An empty heroImage is allowed: it falls back to the first featured photo.
            if (siteConfig.heroImage) {
                expect([...galleryPaths]).toContain(siteConfig.heroImage);
            }
        });

        it('points seoImage at an existing image', () => {
            const { seoImage } = siteConfig;
            // Empty reuses heroImage; a full URL cannot be checked offline.
            if (!seoImage || /^https?:\/\//.test(seoImage)) return;
            if (seoImage.startsWith('/')) {
                expect(fs.existsSync(path.join('public', seoImage))).toBe(true);
            } else {
                expect([...galleryPaths]).toContain(seoImage);
            }
        });
    });
});
