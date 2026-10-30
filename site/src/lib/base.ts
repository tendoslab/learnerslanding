// The site can be served from a sub-path (e.g. GitHub Pages at /learnerslanding/),
// so every internal link and asset path goes through withBase().
const BASE = import.meta.env.BASE_URL.replace(/\/$/, '');

export const withBase = (path: string) => BASE + path;
