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
    owner: 'Paul Isaris', // used in <title>, footer, etc.
    // Home-page hero photo — gallery-relative path from gallery.yaml.
    // Leave empty ('') to use the first image of the "featured" collection.
    heroImage: 'noplace/Project_2026_021.jpg',
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
