# Learner's Landing: website

A cozy study workspace (pomodoro timer, tasks, notes, study music) set in a pixel-art
village that grows as you focus, plus study guides and a curated study-video library.

Built with [Astro](https://astro.build) (fast static pages, good for SEO and AdSense),
[React](https://react.dev) for the interactive workspace, and Tailwind CSS.

## Run it locally

You need Node.js 22.12 or newer.

```bash
cd site
npm install
npm run dev        # http://localhost:4321
npm run build      # production build into site/dist
```

## Where things live

| What | File |
| --- | --- |
| Site name, contact email, nav | `src/data/site.ts` |
| Video library (add/remove videos, write your reviews) | `src/data/videos.ts` |
| Study guides (one Markdown file per article) | `src/content/articles/*.md` |
| Shop prices, residents, coin rewards | `src/workspace/rewards.ts` |
| Workspace app (timer, tasks, village…) | `src/workspace/` |
| Pages (home, about, privacy…) | `src/pages/` |
| Decoration pixel art (generator) | `tools/make_decor.py` → `public/sprites/decor/` |
| Character/animal sprites | `public/sprites/` (cropped from the packs in the repo root) |

### Add an article

Create `src/content/articles/my-new-guide.md`:

```md
---
title: "My New Guide"
description: "One or two sentences that appear in Google and on the guides page."
pubDate: 2026-11-01
category: Focus   # Focus | Habits | Motivation | Planning | Study tools
emoji: "✨"
---

Your article here…
```

It appears at `/articles/my-new-guide` automatically.

### Add a video

Add an entry to `VIDEOS` in `src/data/videos.ts`. The `youtubeId` is the part after
`watch?v=` in the YouTube URL. Set `player: true` to show it in the workspace music player,
and fill in `review` with your own thoughts: that original writing is what gives each video
page value.

## How progress is saved

Everything is stored in the visitor's browser (localStorage) under one key. Visitors can
download/restore a backup in the workspace settings. To add user accounts later
(e.g. Supabase or Firebase), swap the storage adapter in `src/workspace/storage.ts`; the
rest of the app reads and writes through it.

## Deploying

The repo root has a `netlify.toml`, so on [Netlify](https://www.netlify.com) you can just
"Import from GitHub" and it builds `site/` automatically. For Vercel or Cloudflare Pages, set
the **root directory** to `site`, build command `npm run build`, output `dist`.

**GitHub Pages:** `.github/workflows/deploy-pages.yml` builds and publishes the site on every
push to `main`. One-time setup: repo **Settings → Pages → Build and deployment → Source:
GitHub Actions**. It sets `BASE_PATH` (e.g. `/learnerslanding`) automatically; in code, wrap
internal links and asset paths in `withBase()` from `src/lib/base.ts` so they work under it.

Set these environment variables in your host's dashboard:

- `SITE_URL`: your real domain, e.g. `https://learnerslanding.com`
- `PUBLIC_ADSENSE_CLIENT`: your `ca-pub-…` ID, **only after AdSense approves you**
- `PUBLIC_ADSENSE_SLOT`: (optional) an ad-unit slot ID for the in-article ad spots

Also update the domain in `public/robots.txt`.

## AdSense checklist

- [ ] Use a custom domain (AdSense rarely approves free subdomains outside Blogger).
- [ ] Rewrite the About page and articles in your own voice and add your own experiences.
- [ ] Fill in `review` for each video and set `contactEmail` in `src/data/site.ts`.
- [ ] Publish new articles regularly; aim for 15–30 solid ones before applying.
- [ ] Submit the sitemap (`/sitemap-index.xml`) in Google Search Console.
- [ ] After approval, add `public/ads.txt` with the line AdSense gives you, set the env vars,
      and turn on Google's consent message (Privacy & messaging) for EEA/UK visitors.

Ads are kept off the workspace page on purpose: AdSense doesn't allow ads on pages that are
mostly interactive tools without content, and they would distract people studying.

## Credits

Sprites by GrafxKid (CC0), the Little Animals Pack (commercial use allowed, no resale), and
the "72 Character Free" pack. **Check that last pack's licence on its download page** before
launch; it wasn't included in the upload.
