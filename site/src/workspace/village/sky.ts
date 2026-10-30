import type { SkyMode } from '../store';

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

export interface Sky {
  phase: Phase;
  skyTop: string;
  skyMid: string;
  skyBottom: string;
  /** Soft glow along the horizon. */
  horizon: string;
  body: string;
  bodyShade: string;
  bodyGlow: string;
  /** Sun/moon distance from the top of the screen, in %. */
  bodyTop: number;
  stars: number;
  cloud: string;
  cloudShade: string;
  mountain: string;
  mountainShade: string;
  snow: string;
  hillFar: string;
  hillNear: string;
  treeline: string;
  grassTop: string;
  grassBottom: string;
  grassEdge: string;
  grassDark: string;
  /** CSS filter that puts sprites and decorations in the same light as the scenery. */
  light: string;
  /** Lighter version for things that give off light (campfire, lamp, lit windows). */
  emissive: string;
  /** Coloured wash over the ground layer (moonlight, sunset), multiplied. */
  wash: string;
  washOpacity: number;
  /** Ground shadows: darkness, how far they stretch, and which way (sun is on the right). */
  shadow: { opacity: number; stretch: number; shift: number };
}

const PALETTES: Record<Phase, Omit<Sky, 'phase'>> = {
  dawn: {
    skyTop: '#4a3f7a', skyMid: '#b07aa1', skyBottom: '#f6b48f', horizon: 'rgba(255,200,150,0.55)',
    body: '#ffe1a8', bodyShade: '#ffc27a', bodyGlow: 'rgba(255,190,130,0.55)', bodyTop: 30,
    stars: 0.15, cloud: '#ffd6c9', cloudShade: '#e9a6a6',
    mountain: '#9c8ab5', mountainShade: '#8371a3', snow: '#f4dfe6',
    hillFar: '#7f8fa6', hillNear: '#5f7f86', treeline: '#46665f',
    grassTop: '#6aa06a', grassBottom: '#3f6d48', grassEdge: '#8cc47e', grassDark: '#4f8455',
    light: 'sepia(.22) saturate(1.05) hue-rotate(-12deg) brightness(.97)', emissive: 'sepia(.1) brightness(1)', wash: '#ffb48a', washOpacity: 0.08, shadow: { opacity: 0.32, stretch: 1.9, shift: -38 },
  },
  day: {
    skyTop: '#3f8fd8', skyMid: '#74b9ec', skyBottom: '#c9ecf6', horizon: 'rgba(255,255,255,0.45)',
    body: '#fff3b0', bodyShade: '#ffe27a', bodyGlow: 'rgba(255,240,170,0.65)', bodyTop: 10,
    stars: 0, cloud: '#ffffff', cloudShade: '#dbeaf5',
    mountain: '#9cbcd4', mountainShade: '#86a9c4', snow: '#f6fbff',
    hillFar: '#8fc1a9', hillNear: '#6aa877', treeline: '#3f8550',
    grassTop: '#79b863', grassBottom: '#4b8a4f', grassEdge: '#9ed37f', grassDark: '#5e9e55',
    light: 'saturate(1.02)', emissive: 'saturate(1.02)', wash: '#ffffff', washOpacity: 0, shadow: { opacity: 0.3, stretch: 1.15, shift: -10 },
  },
  dusk: {
    skyTop: '#2a1b3d', skyMid: '#7a3f6e', skyBottom: '#ec8a62', horizon: 'rgba(255,150,100,0.5)',
    body: '#ffb46b', bodyShade: '#f08a4b', bodyGlow: 'rgba(255,150,90,0.55)', bodyTop: 36,
    stars: 0.35, cloud: '#f2a6a0', cloudShade: '#c47390',
    mountain: '#7d5a8e', mountainShade: '#6a4a7c', snow: '#e8b8c8',
    hillFar: '#5e4f7a', hillNear: '#3e4d62', treeline: '#2f3d4c',
    grassTop: '#4f7a52', grassBottom: '#2c4a36', grassEdge: '#6b9a66', grassDark: '#3d6343',
    light: 'sepia(.25) saturate(.9) hue-rotate(-15deg) brightness(.82)', emissive: 'sepia(.1) brightness(.98)', wash: '#c0607a', washOpacity: 0.14, shadow: { opacity: 0.34, stretch: 2, shift: -42 },
  },
  night: {
    skyTop: '#0d0920', skyMid: '#1f1840', skyBottom: '#3a2d5c', horizon: 'rgba(120,110,200,0.3)',
    body: '#f3f0dc', bodyShade: '#cfcab0', bodyGlow: 'rgba(230,230,255,0.3)', bodyTop: 12,
    stars: 1, cloud: '#4a3f6e', cloudShade: '#3a3158',
    mountain: '#3c3870', mountainShade: '#322f60', snow: '#9a98c8',
    hillFar: '#2f3a5e', hillNear: '#25344f', treeline: '#1a2a38',
    grassTop: '#2f5140', grassBottom: '#16291f', grassEdge: '#3f6a50', grassDark: '#24402f',
    light: 'saturate(.62) brightness(.74)', emissive: 'saturate(.9) brightness(.97)', wash: '#4a52a8', washOpacity: 0.42, shadow: { opacity: 0.38, stretch: 1, shift: 0 },
  },
};

export const phaseForHour = (h: number): Phase => (h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night');

export const skyFor = (mode: SkyMode, date = new Date()): Sky => {
  const phase: Phase = mode === 'auto' ? phaseForHour(date.getHours()) : mode;
  return { phase, ...PALETTES[phase] };
};
