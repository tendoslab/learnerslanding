// Small Web Audio helpers: a soft "rain" noise generator and an end-of-session chime.
// Nothing here downloads audio files; everything is synthesised in the browser.

let ctx: AudioContext | null = null;
let noiseGain: GainNode | null = null;

const audio = () => {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
};

const buildNoise = (ac: AudioContext) => {
  // Brown-ish noise (integrated white noise) through a low-pass filter sounds like steady rain.
  const length = ac.sampleRate * 4;
  const buffer = ac.createBuffer(2, length, ac.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 500;
  const gain = ac.createGain();
  gain.gain.value = 0;
  src.connect(filter).connect(gain).connect(ac.destination);
  src.start();
  return gain;
};

export const setRain = (on: boolean, volume = 0.5) => {
  const ac = audio();
  if (!noiseGain) noiseGain = buildNoise(ac);
  noiseGain.gain.setTargetAtTime(on ? volume : 0, ac.currentTime, 0.4);
};

export const chime = () => {
  const ac = audio();
  const now = ac.currentTime;
  [659.25, 783.99, 1046.5].forEach((freq, i) => {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = freq;
    const t = now + i * 0.16;
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  });
};
