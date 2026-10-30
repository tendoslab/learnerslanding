import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const articles = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/articles' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z.enum(['Focus', 'Habits', 'Motivation', 'Planning', 'Study tools']),
    emoji: z.string().default('📘'),
    draft: z.boolean().default(false),
    /** Videos/books that inspired the article (shown as "Further reading"). */
    sources: z.array(z.object({ author: z.string(), title: z.string() })).default([]),
  }),
});

export const collections = { articles };
