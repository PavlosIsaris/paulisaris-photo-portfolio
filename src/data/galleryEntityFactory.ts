import path from 'path';
import { promises as fs } from 'fs';
import type { GalleryImage } from './galleryData.ts';
import exifr from 'exifr';

export const createGalleryImage = async (
    galleryDir: string,
    file: string,
): Promise<GalleryImage> => {
    // Normalise to forward slashes so paths match the POSIX-style keys used by
    // `import.meta.glob` in imageStore (path.relative uses "\" on Windows).
    const relativePath = path.relative(galleryDir, file).split(path.sep).join('/');
    // Pass a buffer, not the path: for paths exifr 7.1.3 calls `fileHandle.stat(path)`, which
    // Node 26 rejects because FileHandle.stat() only accepts an options object.
    const exifData = await exifr.parse(await fs.readFile(file));
    const image = {
        path: relativePath,
        meta: {
            title: toReadableCaption(path.basename(relativePath, path.extname(relativePath))),
            description: '',
            collections: collectionIdForImage(relativePath),
        },
        exif: {},
    };
    if (exifData) {
        image.exif = {
            captureDate: exifData.DateTimeOriginal
                ? new Date(`${exifData.DateTimeOriginal} UTC`)
                : undefined,
            fNumber: exifData.FNumber,
            focalLength: exifData.FocalLength,
            iso: exifData.ISO,
            model: exifData.Model,
            shutterSpeed: 1 / exifData.ExposureTime,
            lensModel: exifData.LensModel,
        };
    }
    return image;
};

function toReadableCaption(input: string): string {
    return input
        .replace(/[^a-zA-Z0-9]+/g, ' ') // Replace non-alphanumerics with space
        .split(' ') // Split by space
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Capitalize
        .join(' ');
}

function collectionIdForImage(relativePath: string) {
    return path.dirname(relativePath) === '.' ? [] : [path.dirname(relativePath)];
}

export const createGalleryCollection = (dir: string) => {
    return {
        id: dir,
        name: toReadableCaption(dir),
    };
};
