import { PageFlip } from 'page-flip/dist/js/page-flip.module.js';

// Client behaviour for the album flipbook. Each <dialog data-flipbook> holds one book; the
// StPageFlip instance is built lazily the first time the dialog opens (so the mount already has
// a real size) and rebuilt on open/resize to fit the current viewport. Mirrors the
// script-per-feature pattern in src/scripts/photo-grid.ts.

type FlipInstance = InstanceType<typeof PageFlip>;

const instances = new Map<string, FlipInstance>();
let openDialog: HTMLDialogElement | null = null;

function imageUrls(base: string, id: string, pages: number): string[] {
    // Match the zero-padding used by src/data/flipbook-generator.ts.
    const padLength = Math.max(3, String(pages).length);
    const urls: string[] = [];
    for (let page = 1; page <= pages; page += 1) {
        urls.push(`${base}flipbooks/${id}/page-${String(page).padStart(padLength, '0')}.webp`);
    }
    return urls;
}

function updateStatus(dialog: HTMLDialogElement, flip: FlipInstance): void {
    const status = dialog.querySelector<HTMLElement>('[data-flipbook-status]');
    if (!status) return;
    const total = flip.getPageCount();
    const current = flip.getCurrentPageIndex() + 1;
    status.textContent = `Page ${current} of ${total}`;
}

function destroyInstance(id: string): void {
    const existing = instances.get(id);
    if (existing) {
        existing.destroy();
        instances.delete(id);
    }
}

function buildBook(dialog: HTMLDialogElement): void {
    const id = dialog.dataset.id;
    const mount = dialog.querySelector<HTMLElement>('[data-flipbook-book]');
    if (!id || !mount) return;

    const pages = Number(dialog.dataset.pages);
    const pageWidth = Number(dialog.dataset.width);
    const pageHeight = Number(dialog.dataset.height);
    const base = dialog.dataset.base ?? '/';
    if (!pages || !pageWidth || !pageHeight) return;

    destroyInstance(id);

    // Wait for the dialog to lay out so the mount reports its real size.
    requestAnimationFrame(() => {
        const maxWidth = Math.max(200, Math.floor(mount.clientWidth));
        const maxHeight = Math.max(200, Math.floor(mount.clientHeight));

        const flip = new PageFlip(mount, {
            width: pageWidth,
            height: pageHeight,
            size: 'stretch',
            minWidth: 200,
            maxWidth,
            minHeight: 200,
            maxHeight,
            usePortrait: true,
            showCover: true,
            drawShadow: true,
            flippingTime: 700,
            maxShadowOpacity: 0.5,
            mobileScrollSupport: false,
        });

        flip.on('flip', () => updateStatus(dialog, flip));
        flip.on('init', () => updateStatus(dialog, flip));
        flip.loadFromImages(imageUrls(base, id, pages));
        instances.set(id, flip);
        updateStatus(dialog, flip);
    });
}

function openFlipbook(dialog: HTMLDialogElement): void {
    if (!dialog.open) dialog.showModal();
    openDialog = dialog;
    buildBook(dialog);
}

function wireDialog(dialog: HTMLDialogElement): void {
    dialog.querySelector('[data-flipbook-close]')?.addEventListener('click', () => dialog.close());
    dialog.querySelector('[data-flipbook-prev]')?.addEventListener('click', () => {
        instances.get(dialog.dataset.id ?? '')?.flipPrev();
    });
    dialog.querySelector('[data-flipbook-next]')?.addEventListener('click', () => {
        instances.get(dialog.dataset.id ?? '')?.flipNext();
    });

    // Click the dark area around the book (not the book or a control) to dismiss.
    dialog.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.closest('[data-flipbook-book]') || target.closest('button')) return;
        dialog.close();
    });

    dialog.addEventListener('close', () => {
        destroyInstance(dialog.dataset.id ?? '');
        if (openDialog === dialog) openDialog = null;
    });
}

function debounce<T extends (...args: unknown[]) => unknown>(fn: T, wait: number) {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), wait);
    };
}

function setup(): void {
    document.querySelectorAll<HTMLElement>('[data-flipbook-trigger]').forEach((trigger) => {
        const dialog = document.getElementById(trigger.dataset.flipbookTrigger ?? '');
        if (!(dialog instanceof HTMLDialogElement)) return;
        trigger.addEventListener('click', () => openFlipbook(dialog));
    });

    document.querySelectorAll<HTMLDialogElement>('dialog[data-flipbook]').forEach(wireDialog);

    // Rebuild the open book so it re-fits after a viewport/orientation change.
    window.addEventListener(
        'resize',
        debounce(() => {
            if (openDialog?.open) buildBook(openDialog);
        }, 250),
    );
}

if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        setup();
    }
}
