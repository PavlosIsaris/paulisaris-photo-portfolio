import { program } from 'commander';
import * as fs from 'node:fs';
import * as yaml from 'js-yaml';
import path from 'path';
import { fileURLToPath } from 'node:url';
import fg from 'fast-glob';
import * as prettier from 'prettier';
import {
    featuredCollectionId,
    type GalleryData,
    loadGallery,
    NullGalleryData,
} from './galleryData.ts';
import { createGalleryCollection, createGalleryImage } from './galleryEntityFactory.ts';

const defaultGalleryFileName = 'gallery.yaml';

async function generateGalleryFile(galleryDir: string): Promise<void> {
    try {
        let galleryObj = await loadExistingGallery(galleryDir);
        galleryObj = mergeGalleriesObj(galleryObj, await createGalleryObjFrom(galleryDir));
        await writeGalleryYaml(galleryDir, galleryObj);
    } catch (error) {
        console.error('Failed to create gallery file:', error);
        process.exit(1);
    }
}

async function loadExistingGallery(galleryDir: string) {
    const existingGalleryFile = path.join(galleryDir, defaultGalleryFileName);
    if (fs.existsSync(existingGalleryFile)) {
        return await loadGallery(existingGalleryFile);
    }
    return NullGalleryData;
}

function mergeGalleriesObj(
    targetGalleryObj: GalleryData,
    sourceGalleryObj: GalleryData,
): GalleryData {
    return {
        collections: getUpdatedCollectionList(targetGalleryObj, sourceGalleryObj),
        images: getUpdatedImageList(targetGalleryObj, sourceGalleryObj),
    };
}

function getUpdatedImageList(targetGalleryObj: GalleryData, sourceGalleryObj: GalleryData) {
    const imagesMap = new Map(targetGalleryObj.images.map((image) => [image.path, image]));
    sourceGalleryObj.images.forEach((image) => {
        const existingImage = imagesMap.get(image.path);
        if (existingImage === undefined) {
            imagesMap.set(image.path, image);
        } else {
            existingImage.exif = image.exif;
        }
    });
    return Array.from(imagesMap.values());
}

function getUpdatedCollectionList(targetGalleryObj: GalleryData, sourceGalleryObj: GalleryData) {
    const collectionsMap = new Map(
        targetGalleryObj.collections.map((collection) => [collection.id, collection]),
    );
    sourceGalleryObj.collections.forEach((collection) => {
        if (!collectionsMap.get(collection.id)) {
            collectionsMap.set(collection.id, collection);
        }
    });
    return Array.from(collectionsMap.values());
}

async function createGalleryObjFrom(galleryDir: string): Promise<GalleryData> {
    const imageFiles = await fg(`${galleryDir}/**/*.{jpg,jpeg,png}`, {
        dot: false,
    });
    return {
        collections: createCollectionsFrom(imageFiles, galleryDir),
        images: await createImagesFrom(imageFiles, galleryDir),
    };
}

function createCollectionsFrom(imageFiles: string[], galleryDir: string) {
    const uniqueDirNames = new Set(
        imageFiles.map((file) => path.dirname(path.relative(galleryDir, file))),
    );

    // src/gallery/featured/ holds the photos of the built-in `featured` collection. As a regular
    // collection it would get its own /collections/featured page.
    return [...uniqueDirNames]
        .map((dir) => {
            return createGalleryCollection(dir);
        })
        .filter((col) => col.id !== '.' && col.id !== featuredCollectionId);
}

async function createImagesFrom(imageFiles: string[], galleryDir: string) {
    return Promise.all(imageFiles.map((file) => createGalleryImage(galleryDir, file)));
}

async function writeGalleryYaml(galleryDir: string, galleryObj: GalleryData) {
    const filePath = path.join(galleryDir, defaultGalleryFileName);
    // gallery.yaml is hand-edited and committed. Without Prettier, every run would rewrite the
    // whole file in js-yaml's style. Prettier keeps the line breaks of folded descriptions, so
    // js-yaml must already wrap them at Prettier's indent and width. The config is resolved
    // from this script, not from galleryDir, so a gallery outside the repository gets the
    // same style.
    const options = await prettier.resolveConfig(fileURLToPath(import.meta.url));
    const dumped = yaml.dump(galleryObj, {
        indent: options?.tabWidth,
        lineWidth: options?.printWidth,
    });
    const content = await prettier.format(dumped, { ...options, parser: 'yaml' });
    await fs.promises.writeFile(filePath, content, 'utf8');
    console.log('Gallery file created/updated successfully at:', filePath);
}

program.argument('<path to images directory>');
program.parse();

const directoryPath = program.args[0];
if (!directoryPath || !fs.existsSync(directoryPath)) {
    console.error('Invalid directory path provided.');
    process.exit(1);
}

(async () => {
    await generateGalleryFile(directoryPath);
})().catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
});
