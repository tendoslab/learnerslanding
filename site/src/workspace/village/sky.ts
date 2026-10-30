import type { SkyMode } from '../store';

export type Phase = 'dawn' | 'day' | 'dusk' | 'night';

export interface Sky {
  phase: Phase;
  skyTop: string;
  skyBottom: string;
  body: string;
  bodyGlow: string;
  /** Sun/moon distance from the top of the screen, in %. */
  bodyTop: number;
  stars: number;
  cloud: string;
  hillFar: string;
  hillNear: string;
  grassTop: string;
  grassBottom: string;
  grassEdge: string;
  tint: string;
  tintOpacity: number;
}

const PALETTES: Record<Phase, Omit<Sky, 'phase'>> = {
  dawn: {
    skyTop: '#6b5b95', skyBottom: '#f6b48f', body: '#ffd9a0', bodyGlow: 'rgba(255,190,130,0.6)', bodyTop: 30,
    stars: 0.15, cloud: '#ffd6c9', hillFar: '#8c7aa8', hillNear: '#5f7f86',
    grassTop: '#6aa06a', grassBottom: '#3f6d48', grassEdge: '#8cc47e', tint: '#ffb48a', tintOpacity: 0.12,
  },
  day: {
    skyTop: '#5aa8e6', skyBottom: '#bfe6f5', body: '#fff3b0', bodyGlow: 'rgba(255,240,170,0.7)', bodyTop: 10,
    stars: 0, cloud: '#ffffff', hillFar: '#8fc1a9', hillNear: '#5f9d72',
    grassTop: '#79b863', grassBottom: '#4b8a4f', grassEdge: '#9ed37f', tint: '#ffffff', tintOpacity: 0,
  },
  dusk: {
    skyTop: '#2a1b3d', skyBottom: '#e07a5f', body: '#ffb46b', bodyGlow: 'rgba(255,150,90,0.6)', bodyTop: 36,
    stars: 0.35, cloud: '#f2a6a0', hillFar: '#6b4c7a', hillNear: '#3e4d62',
    grassTop: '#4f7a52', grassBottom: '#2c4a36', grassEdge: '#6b9a66', tint: '#b0607a', tintOpacity: 0.25,
  },
  night: {
    skyTop: '#120c24', skyBottom: '#3a2d5c', body: '#f3f0dc', bodyGlow: 'rgba(230,230,255,0.35)', bodyTop: 12,
    stars: 1, cloud: '#4a3f6e', hillFar: '#3a3666', hillNear: '#28395a',
    grassTop: '#2f5140', grassBottom: '#16291f', grassEdge: '#3f6a50', tint: '#3b3f8f', tintOpacity: 0.4,
  },
};

export const phaseForHour = (h: number): Phase => (h >= 5 && h < 8 ? 'dawn' : h >= 8 && h < 17 ? 'day' : h >= 17 && h < 20 ? 'dusk' : 'night');

export const skyFor = (mode: SkyMode, date = new Date()): Sky => {
  const phase: Phase = mode === 'auto' ? phaseForHour(date.getHours()) : mode;
  return { phase, ...PALETTES[phase] };
};
