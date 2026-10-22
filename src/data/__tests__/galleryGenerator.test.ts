import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import * as prettier from 'prettier';
import { loadGallery } from '../galleryData.ts';

const GENERATOR = 'src/data/gallery-generator.ts';
const FIXTURE_DIR = 'src/data/__tests__/gallery';

/**
 * Runs the real `npm run generate` CLI on a temporary copy of the fixture photos, with one photo
 * in a `featured/` folder like src/gallery/featured/.
 */
describe('Gallery generator', () => {
    let galleryDir: string;

    beforeEach(() => {
        galleryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gallery-generator-'));
        for (const dir of ['kuku', 'popo']) {
            fs.cpSync(path.join(FIXTURE_DIR, dir), path.join(galleryDir, dir), { recursive: true });
        }
        fs.mkdirSync(path.join(galleryDir, 'featured'));
        fs.copyFileSync(
            path.join(FIXTURE_DIR, 'landscape.jpg'),
            path.join(galleryDir, 'featured', 'landscape.jpg'),
        );
        execFileSync('npx', ['tsx', GENERATOR, galleryDir], { stdio: 'pipe' });
    });

    afterEach(() => {
        fs.rmSync(galleryDir, { recursive: true, force: true });
    });

    it('does not add the built-in featured collection to `collections`', async () => {
        const gallery = await loadGallery(path.join(galleryDir, 'gallery.yaml'));
        const ids = gallery.collections.map((collection) => collection.id).sort();
        expect(ids).toEqual(['kuku', 'popo']);
        const featuredImage = gallery.images.find(
            (image) => image.path === 'featured/landscape.jpg',
        );
        expect(featuredImage?.meta.collections).toEqual(['featured']);
    });

    it('writes gallery.yaml in the Prettier style of the repository', async () => {
        const content = fs.readFileSync(path.join(galleryDir, 'gallery.yaml'), 'utf8');
        const options = await prettier.resolveConfig(GENERATOR);
        expect(content).toEqual(await prettier.format(content, { ...options, parser: 'yaml' }));
    });
}, 30_000);
