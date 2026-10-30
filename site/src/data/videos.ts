// The video depository. Every video here gets its own page at /videos/<slug>
// and (if `player` is true) shows up in the workspace's built-in player.
//
// `review` is YOUR words: why you like it, when you use it, what it helped with.
// Original writing like this is what makes the page valuable to readers (and to
// AdSense reviewers), so fill these in over time. Pages hide the section while empty.

export type VideoCategory = 'pomodoro' | 'ambience' | 'frequencies' | 'meditation' | 'adhd';

export interface Video {
  slug: string;
  youtubeId: string;
  title: string;
  category: VideoCategory;
  length: string;
  /** Focus/break pattern in minutes, for pomodoro-style videos. */
  pattern?: [number, number];
  summary: string;
  review?: string;
  player?: boolean;
}

export const CATEGORIES: Record<VideoCategory, { label: string; blurb: string; emoji: string }> = {
  pomodoro: {
    label: 'Pomodoro',
    emoji: '🍅',
    blurb: 'Study-with-me style videos with built-in focus and break timers, so you never have to watch the clock.',
  },
  ambience: {
    label: 'Ambience',
    emoji: '🌧️',
    blurb: 'Rain, fireplaces, libraries and cafés: long, steady background soundscapes that cover up distracting noise.',
  },
  frequencies: {
    label: 'Frequencies',
    emoji: '🎧',
    blurb: 'Binaural beats and 40 Hz tones. Some people find them helpful for settling into focus; headphones recommended.',
  },
  meditation: {
    label: 'Meditation',
    emoji: '🧘',
    blurb: 'Short guided meditations for resetting between sessions, calming exam nerves, or winding down after a long day.',
  },
  adhd: {
    label: 'ADHD',
    emoji: '⚡',
    blurb: 'Formats that work well for restless or easily-distracted brains: shorter cycles, more visual cues, more structure.',
  },
};

export const VIDEOS: Video[] = [
  {
    slug: 'yokohama-harbour-25-5',
    youtubeId: 'sUwD3GRPJos',
    title: 'Yokohama Harbour',
    category: 'pomodoro',
    length: '25/5 cycles',
    pattern: [25, 5],
    summary: 'Classic 25-minute focus blocks with 5-minute breaks, set against a calm harbour view. A great default if you are new to the pomodoro technique.',
    player: true,
  },
  {
    slug: 'shinjuku-50-10',
    youtubeId: 'ATOPZqUfzUo',
    title: 'Shinjuku',
    category: 'pomodoro',
    length: '50/10 cycles',
    pattern: [50, 10],
    summary: 'Longer 50-minute focus blocks with 10-minute breaks and a city backdrop. Good for essays, problem sets and anything that needs warm-up time.',
    player: true,
  },
  {
    slug: 'winter-jazz-60-10',
    youtubeId: 'qGITGZwk490',
    title: 'Winter Jazz',
    category: 'pomodoro',
    length: '60/10 cycles',
    pattern: [60, 10],
    summary: 'Hour-long focus sessions with soft jazz and a wintery mood, for deep-work days when you already feel settled.',
    player: true,
  },
  {
    slug: 'balcony-moonrise-lofi-50-10',
    youtubeId: 'WL5XBs_ha3g',
    title: 'Balcony Moon Rise with Lofi',
    category: 'pomodoro',
    length: '50/10 cycles',
    pattern: [50, 10],
    summary: 'Lofi beats and a moonrise over the city in 50/10 cycles. A cozy pick for evening study sessions.',
    player: true,
  },
  {
    slug: 'adhd-pomodoro-30-5',
    youtubeId: 'brnafxH_0E8',
    title: 'ADHD Pomodoro',
    category: 'adhd',
    length: '30/5 cycles',
    pattern: [30, 5],
    summary: 'A pomodoro session made with ADHD brains in mind, in a predictable 30-minute focus / 5-minute break rhythm.',
    player: true,
  },
  {
    slug: 'library-fireplace-thunderstorm',
    youtubeId: 'CHFif_y2TyM',
    title: 'Library with Fireplace, Thunderstorm and Rain',
    category: 'ambience',
    length: '3 hours',
    summary: 'A crackling fire, distant thunder and rain on old library windows. Three uninterrupted hours of dark-academia atmosphere.',
    player: true,
  },
  {
    slug: 'rooftop-study-room-rain',
    youtubeId: 'Jvgx5HHJ0qw',
    title: 'Rooftop Study Room with Rain',
    category: 'ambience',
    length: '3 hours',
    summary: 'Steady rain over a rooftop study room. Even, gentle noise that masks chatter and traffic well.',
    player: true,
  },
  {
    slug: 'rain-on-window-8-hours',
    youtubeId: 'mPZkdNFkNps',
    title: 'Rain on Window',
    category: 'ambience',
    length: '8 hours',
    summary: 'Eight hours of rain against a window, long enough for a full study day (or for sleep).',
    player: true,
  },
  {
    slug: 'animal-crossing-ambience',
    youtubeId: 'AAbK---4bB4',
    title: 'Animal Crossing Ambience',
    category: 'ambience',
    length: '2 hours',
    summary: 'Relaxing music and café sounds inspired by Animal Crossing. Cheerful but low-key, perfect for lighter tasks.',
    player: true,
  },
  {
    slug: 'binaural-beats-40hz',
    youtubeId: 'lkkGlVWvkLk',
    title: 'Binaural Beats 40 Hz',
    category: 'frequencies',
    length: '2 hours',
    summary: 'Two hours of 40 Hz binaural beats. Binaural beats only work with headphones, since each ear hears a slightly different tone.',
    player: true,
  },
  {
    slug: '40hz-gamma-waves',
    youtubeId: 'TtnK4oWlImE',
    title: '40 Hz Gamma',
    category: 'frequencies',
    length: '2.5 hours',
    summary: 'A long 40 Hz "gamma" track for extended study blocks. Try it for a session or two and see whether it suits you.',
    player: true,
  },
  {
    slug: 'meditation-for-anxiety',
    youtubeId: 'O-6f5wQXSu8',
    title: 'Meditation for Anxiety',
    category: 'meditation',
    length: '10 minutes',
    summary: 'A ten-minute guided meditation for when exam stress or a looming deadline makes it hard to start.',
  },
  {
    slug: 'meditation-for-mindfulness',
    youtubeId: 'ZToicYcHIOU',
    title: 'Meditation for Mindfulness',
    category: 'meditation',
    length: '10 minutes',
    summary: 'A short mindfulness practice. Nice to do during a long break so you come back to your desk with a clear head.',
  },
  {
    slug: 'de-stress-meditation',
    youtubeId: '7Nn8Lel_IfI',
    title: 'De-Stress Meditation',
    category: 'meditation',
    length: '9 minutes',
    summary: 'A nine-minute guided reset to let go of built-up tension after a heavy study block.',
  },
  {
    slug: 'gratitude-meditation',
    youtubeId: 'xH8mXvYWzwM',
    title: 'Gratitude Meditation',
    category: 'meditation',
    length: '10 minutes',
    summary: 'A ten-minute gratitude practice. A gentle way to start the day or close one out.',
  },
  {
    slug: 'manifestation-meditation',
    youtubeId: 'SXabmXhRxs8',
    title: 'Manifestation Meditation',
    category: 'meditation',
    length: '14 minutes',
    summary: 'A fourteen-minute visualisation meditation for picturing your goals and the steps toward them.',
  },
];

export const playerVideos = VIDEOS.filter((v) => v.player);

export const thumb = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
// Standard youtube.com embed, the same one most sites use. The "nocookie" domain
// is on some ad/privacy blocklists, which made videos fail for some visitors.
export const embedUrl = (id: string, autoplay = false) =>
  `https://www.youtube.com/embed/${id}?rel=0&playsinline=1${autoplay ? '&autoplay=1' : ''}`;
