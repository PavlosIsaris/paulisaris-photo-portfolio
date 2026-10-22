import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import astroPlugin from 'eslint-plugin-astro';
import globals from 'globals';

export default defineConfig([
    {
        ignores: ['dist/**', '.astro/**', 'node_modules/**', '.cache/**'],
    },
    js.configs.recommended,
    // Also matches *.ts/*.mts, so `eslint .` lints them without `--ext`.
    tseslint.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.browser,
            },
        },
    },
    // Must come after typescript-eslint: it switches .astro files to astro-eslint-parser, which
    // parses the frontmatter and <script> blocks with the TypeScript parser.
    astroPlugin.configs.recommended,
]);
