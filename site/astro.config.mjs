// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { satteri } from '@astrojs/markdown-satteri';

// Change this to your real domain once you have one (used for the sitemap and SEO tags).
const SITE_URL = process.env.SITE_URL || 'https://learnerslanding.com';
// Sub-path the site is served from, e.g. "/learnerslanding" on GitHub Pages. "/" everywhere else.
const BASE_PATH = process.env.BASE_PATH || '/';

/** Prefixes root-relative links in Markdown articles (e.g. "/workspace") with BASE_PATH. */
const baseLinks = {
  name: 'base-links',
  link(node, ctx) {
    const base = BASE_PATH.replace(/\/$/, '');
    if (base && node.url.startsWith('/') && !node.url.startsWith('//')) ctx.setProperty(node, 'url', base + node.url);
  },
};

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  integrations: [react(), sitemap({ filter: (page) => !page.includes('/404') })],
  markdown: { processor: satteri({ mdastPlugins: [baseLinks] }) },
  vite: { plugins: [tailwindcss()] },
});
