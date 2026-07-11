import type { AstroInstance } from 'astro';
import { Instagram, Mail } from 'lucide-astro';

export interface SocialLink {
    name: string;
    url: string;
    icon: AstroInstance;
}

// ── Edit these to make the site yours ──────────────────────────────
export default {
    title: 'Paul Isaris', // shown in the navbar / logo
    favicon: 'favicon.svg',
    owner: 'Paul Isaris - Παύλος Ίσαρης', // used in <title>, footer, etc.
    // Home-page hero photo — gallery-relative path from gallery.yaml.
    // Leave empty ('') to use the first image of the "featured" collection.
    heroImage: 'noplace/Project_2026_021.jpg',
    // Social-share image (og:image) for pages that don't set their own.
    // A gallery-relative path from gallery.yaml, or a full https:// URL / root-relative
    // path (e.g. '/images/og.jpg'). Leave empty ('') to reuse heroImage.
    seoImage: '/images/seo.jpg',
    profileImage: 'profile.webp', // lives in public/images/
    socialLinks: [
        {
            name: 'Instagram',
            url: 'https://www.instagram.com/_callpaul',
            icon: Instagram,
        } as unknown as SocialLink,
        {
            name: 'Email',
            url: 'mailto:paulisaris@gmail.com',
            icon: Mail,
        } as unknown as SocialLink,
    ],
};
