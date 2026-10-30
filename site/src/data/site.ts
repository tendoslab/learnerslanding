// Global site settings. Edit these before you launch.
export const SITE = {
  name: "Learner's Landing",
  tagline: 'A cozy study workspace that grows a little village as you focus.',
  description:
    "Learner's Landing is a free, cozy study workspace: a pomodoro timer, task list and notes, set in a pixel-art village that grows every time you finish a focus session. Plus study guides and a curated library of focus music and ambience.",
  // Shown on the contact page. Leave blank to hide it.
  contactEmail: '',
  // Used on the privacy policy / terms pages.
  ownerName: "Learner's Landing",
  lastPolicyUpdate: '2026-10-29',
};

// AdSense publisher id (ca-pub-...). Set PUBLIC_ADSENSE_CLIENT in your hosting
// dashboard once you are approved; nothing ad-related loads while it is empty.
export const ADSENSE_CLIENT: string = import.meta.env.PUBLIC_ADSENSE_CLIENT ?? '';

export const NAV = [
  { href: '/workspace', label: 'Workspace' },
  { href: '/videos', label: 'Study Videos' },
  { href: '/articles', label: 'Guides' },
  { href: '/about', label: 'About' },
];
