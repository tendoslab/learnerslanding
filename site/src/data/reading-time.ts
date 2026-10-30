/** Rough reading time in minutes (~220 words per minute). */
export const readingTime = (markdown: string) => Math.max(1, Math.round(markdown.split(/\s+/).filter(Boolean).length / 220));
