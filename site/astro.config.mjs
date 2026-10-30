// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// Change this to your real domain once you have one (used for the sitemap and SEO tags).
const SITE_URL = process.env.SITE_URL || 'https://learnerslanding.com';

export default defineConfig({
  site: SITE_URL,
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/404') })],
  vite: { plugins: [tailwindcss()] },
});
