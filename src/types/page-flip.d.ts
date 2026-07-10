// Minimal typings for the StPageFlip ESM build (the package ships no declarations).
// Only the surface we use is declared.
declare module 'page-flip/dist/js/page-flip.module.js' {
    export interface PageFlipSettings {
        width: number;
        height: number;
        size?: 'fixed' | 'stretch';
        minWidth?: number;
        maxWidth?: number;
        minHeight?: number;
        maxHeight?: number;
        drawShadow?: boolean;
        flippingTime?: number;
        usePortrait?: boolean;
        startZIndex?: number;
        autoSize?: boolean;
        maxShadowOpacity?: number;
        showCover?: boolean;
        mobileScrollSupport?: boolean;
        clickEventForward?: boolean;
        useMouseEvents?: boolean;
        swipeDistance?: number;
        showPageCorners?: boolean;
        disableFlipByClick?: boolean;
    }

    export interface FlipEvent {
        data: number;
        object: unknown;
    }

    export class PageFlip {
        constructor(element: HTMLElement, settings: PageFlipSettings);
        loadFromImages(images: string[]): void;
        flipNext(corner?: 'top' | 'bottom'): void;
        flipPrev(corner?: 'top' | 'bottom'): void;
        turnToNextPage(): void;
        turnToPrevPage(): void;
        getCurrentPageIndex(): number;
        getPageCount(): number;
        destroy(): void;
        on(
            event: 'flip' | 'init' | 'changeState' | 'changeOrientation',
            callback: (e: FlipEvent) => void,
        ): void;
    }
}
