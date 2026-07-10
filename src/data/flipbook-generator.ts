import { program } from 'commander';
import * as fs from 'node:fs';
import path from 'node:path';
import fg from 'fast-glob';
import sharp from 'sharp';
import { pdf } from 'pdf-to-img';

// Turns the album PDFs in `flipbooks-src/` into the optimized WebP page images the on-site
// flipbook (StPageFlip) loads, plus a manifest the album page reads at build.
//
// Usage:  npm run flipbook           (reads ./flipbooks-src)
//         npm run flipbook <dir>     (reads a custom source dir)
//
// Album PDFs are exported as reader *spreads*: page 1 = front cover (single), the middle pages
// are two-page spreads (each PDF page holds book pages k|k+1), and the last page = back cover
// (single). StPageFlip stretches each image to fill its page slot, so we split every interior
// spread into two single-leaf images (and keep the covers as whole leaf-sized pages) — that
// gives a real book that turns one leaf at a time. Output: `public/flipbooks/<id>/page-NNN.webp`
// (committed + served verbatim) and `src/data/flipbooks.json` mapping `<id>` -> leaf count and
// single-leaf dimensions. Source PDFs stay local (see .gitignore).
//
// Per-book overrides live in an optional `flipbooks-src/flipbooks.config.json`, e.g.:
//   { "noplace-el": { "layout": "spreads", "frontCover": true, "backCover": true } }
// Defaults (when a book is absent) match the noplace books: spreads with front + back cover.
// `layout: "single"` skips splitting for PDFs that are already one book page per PDF page.

const RENDER_SCALE = 3; // pdf-to-img render scale (relative to 72dpi); higher = sharper source
const LEAF_MAX_HEIGHT = 1600; // long edge of a single leaf in the shipped WebP
const WEBP_QUALITY = 80;
const TRIM_THRESHOLD = 15; // sharp trim tolerance for the white cover margins

const OUTPUT_ROOT = path.join('public', 'flipbooks');
const MANIFEST_PATH = path.join('src', 'data', 'flipbooks.json');
const CONFIG_NAME = 'flipbooks.config.json';

interface FlipbookEntry {
    pages: number; // total single leaves (covers + split spread halves)
    width: number; // single-leaf width in px
    height: number; // single-leaf height in px
}
type Manifest = Record<string, FlipbookEntry>;

interface BookConfig {
    layout: 'spreads' | 'single';
    frontCover: boolean;
    backCover: boolean;
}
const DEFAULT_CONFIG: BookConfig = { layout: 'spreads', frontCover: true, backCover: true };

interface LeafBox {
    width: number;
    height: number;
}

async function generate(sourceDir: string): Promise<void> {
    const pdfFiles = await fg(`${sourceDir.replace(/\\/g, '/')}/*.pdf`, { dot: false });
    if (pdfFiles.length === 0) {
        console.warn(`No PDFs found in ${sourceDir}. Nothing to do.`);
        return;
    }

    const configs = loadConfigs(sourceDir);
    const manifest = loadManifest();
    for (const pdfFile of pdfFiles) {
        const id = path.basename(pdfFile, path.extname(pdfFile));
        manifest[id] = await convertPdf(pdfFile, id, configs[id] ?? DEFAULT_CONFIG);
    }
    writeManifest(manifest);
}

async function convertPdf(pdfFile: string, id: string, config: BookConfig): Promise<FlipbookEntry> {
    console.log(`Rendering "${id}" (${config.layout}) from ${pdfFile} …`);
    const outDir = path.join(OUTPUT_ROOT, id);
    // Clear stale pages so re-runs never leave orphans from a different PDF.
    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    const document = await pdf(pdfFile, { scale: RENDER_SCALE });
    const pdfPageCount = document.length;

    // Buffer every rendered page first so we can derive the leaf box from an interior spread
    // before writing anything.
    const pageBuffers: Buffer[] = [];
    let rendered = 0;
    for await (const pngBuffer of document) {
        pageBuffers.push(pngBuffer);
        rendered += 1;
        process.stdout.write(`  rendering ${rendered}/${pdfPageCount}\r`);
    }
    process.stdout.write('\n');

    const leaf = await deriveLeafBox(pageBuffers, config);

    const leaves: Buffer[] = [];
    for (let i = 0; i < pageBuffers.length; i += 1) {
        const isFront = i === 0 && config.frontCover;
        const isBack = i === pageBuffers.length - 1 && config.backCover;
        if (config.layout === 'single' || isFront || isBack) {
            leaves.push(await renderCover(pageBuffers[i], leaf));
        } else {
            const [left, right] = await renderSpreadHalves(pageBuffers[i], leaf);
            leaves.push(left, right);
        }
    }

    const pad = Math.max(3, String(leaves.length).length);
    leaves.forEach((buffer, index) => {
        const fileName = `page-${String(index + 1).padStart(pad, '0')}.webp`;
        fs.writeFileSync(path.join(outDir, fileName), buffer);
    });

    console.log(
        `  → ${pdfPageCount} PDF page(s) → ${leaves.length} leaves in ${outDir} (${leaf.width}×${leaf.height})`,
    );
    return { pages: leaves.length, width: leaf.width, height: leaf.height };
}

// Leaf box = a single book page. For a spread book it is half the spread width at full height;
// for a single-page book it is the page itself. Height is capped at LEAF_MAX_HEIGHT.
async function deriveLeafBox(pageBuffers: Buffer[], config: BookConfig): Promise<LeafBox> {
    // Pick a representative interior page (skip covers when splitting spreads).
    const start = config.layout === 'spreads' && config.frontCover ? 1 : 0;
    const sample = pageBuffers[start] ?? pageBuffers[0];
    const meta = await sharp(sample).metadata();
    const fullWidth = meta.width ?? LEAF_MAX_HEIGHT;
    const fullHeight = meta.height ?? LEAF_MAX_HEIGHT;

    const leafSourceWidth = config.layout === 'spreads' ? Math.floor(fullWidth / 2) : fullWidth;
    const height = Math.min(fullHeight, LEAF_MAX_HEIGHT);
    const scale = height / fullHeight;
    const width = Math.max(1, Math.round(leafSourceWidth * scale));
    return { width, height };
}

async function renderSpreadHalves(pageBuffer: Buffer, leaf: LeafBox): Promise<[Buffer, Buffer]> {
    const meta = await sharp(pageBuffer).metadata();
    const fullWidth = meta.width ?? 0;
    const fullHeight = meta.height ?? 0;
    const half = Math.floor(fullWidth / 2);

    const cut = async (leftOffset: number, cutWidth: number): Promise<Buffer> =>
        sharp(pageBuffer)
            .extract({ left: leftOffset, top: 0, width: cutWidth, height: fullHeight })
            // Halves already share the leaf aspect ratio, so 'fill' does not distort.
            .resize(leaf.width, leaf.height, { fit: 'fill' })
            .webp({ quality: WEBP_QUALITY })
            .toBuffer();

    const left = await cut(0, half);
    const right = await cut(half, fullWidth - half);
    return [left, right];
}

// Covers (and single-page books) keep their whole content: trim the surrounding white margin so
// centered cover art fills the leaf, then letterbox onto a leaf-sized white page for uniformity.
async function renderCover(pageBuffer: Buffer, leaf: LeafBox): Promise<Buffer> {
    let trimmed: Buffer;
    try {
        trimmed = await sharp(pageBuffer).trim({ threshold: TRIM_THRESHOLD }).toBuffer();
    } catch {
        // trim throws if the whole page is uniform; fall back to the original.
        trimmed = pageBuffer;
    }
    return sharp(trimmed)
        .resize(leaf.width, leaf.height, { fit: 'contain', background: '#ffffff' })
        .flatten({ background: '#ffffff' })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
}

function loadConfigs(sourceDir: string): Record<string, BookConfig> {
    const configPath = path.join(sourceDir, CONFIG_NAME);
    if (!fs.existsSync(configPath)) return {};
    try {
        const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Record<
            string,
            Partial<BookConfig>
        >;
        const configs: Record<string, BookConfig> = {};
        for (const [id, partial] of Object.entries(raw)) {
            configs[id] = { ...DEFAULT_CONFIG, ...partial };
        }
        return configs;
    } catch (error) {
        console.warn(`Could not parse ${configPath}; using defaults.`, error);
        return {};
    }
}

function loadManifest(): Manifest {
    if (fs.existsSync(MANIFEST_PATH)) {
        return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
    }
    return {};
}

function writeManifest(manifest: Manifest): void {
    const sorted = Object.fromEntries(
        Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)),
    );
    fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(sorted, null, 4)}\n`, 'utf8');
    console.log(`Manifest updated: ${MANIFEST_PATH}`);
}

program.argument('[source directory]', 'directory holding the source PDFs', 'flipbooks-src');
program.parse();

const sourceDir = program.args[0] ?? 'flipbooks-src';
if (!fs.existsSync(sourceDir)) {
    console.error(`Source directory "${sourceDir}" does not exist.`);
    process.exit(1);
}

generate(sourceDir).catch((error) => {
    console.error('Failed to generate flipbooks:', error);
    process.exit(1);
});
