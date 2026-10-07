/**
 * Live, procedurally synthesised sound effects for explore mode (Web Audio, no samples) —
 * the same palette as audio/alexnet/score.py so the frozen world still sounds like the lesson.
 * Only ever called from user interaction in the browser; the MP4 render never touches it.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let drone: { stop: () => void } | null = null;

const audio = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = 0.55;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};

const env = (g: GainNode, t: number, peak: number, attack: number, decay: number) => {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
};

const tone = (freq: number, peak: number, decay: number, type: OscillatorType = "sine", glideTo?: number, pan = 0) => {
  const c = audio();
  if (!c || !master) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  const g = c.createGain();
  const p = c.createStereoPanner();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + decay);
  p.pan.value = pan;
  env(g, t, peak, 0.004, decay);
  o.connect(g).connect(p).connect(master);
  o.start(t);
  o.stop(t + decay + 0.05);
};

const burst = (peak: number, decay: number, lo: number, hi: number, attack = 0.002, pan = 0, sweep?: [number, number]) => {
  const c = audio();
  if (!c || !master || !noise) return;
  const t = c.currentTime;
  const s = c.createBufferSource();
  s.buffer = noise;
  s.loop = true;
  const f = c.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = Math.sqrt(lo * hi);
  f.Q.value = Math.sqrt(lo * hi) / (hi - lo);
  if (sweep) {
    f.frequency.setValueAtTime(sweep[0], t);
    f.frequency.exponentialRampToValueAtTime(sweep[1], t + attack + decay);
  }
  const g = c.createGain();
  const p = c.createStereoPanner();
  p.pan.value = pan;
  env(g, t, peak, attack, decay);
  s.connect(f).connect(g).connect(p).connect(master);
  s.start(t, Math.random() * 0.9);
  s.stop(t + attack + decay + 0.05);
};

export const sfx = {
  /** typing-like tick for discrete steps */
  tick: (pan = 0) => burst(0.35, 0.025, 2500, 9000, 0.001, pan),
  /** small confirmation tone */
  blip: (freq = 1320, peak = 0.12) => tone(freq, peak, 0.12),
  /** a neuron firing — the crackle of Hubel & Wiesel's loudspeaker */
  spike: () => {
    burst(0.5, 0.012, 1200, 7000, 0.0005, (Math.random() - 0.5) * 0.4);
    tone(180 + Math.random() * 60, 0.12, 0.02, "square");
  },
  chime: () => [1046, 1318, 1568].forEach((f, i) => setTimeout(() => tone(f, 0.12, 1.2), i * 70)),
  whoosh: (up = true) => burst(0.3, 0.45, 300, 6000, 0.25, 0, up ? [400, 6000] : [6000, 400]),
  impact: () => {
    tone(90, 0.7, 0.9, "sine", 32);
    burst(0.3, 0.12, 300, 7000);
  },
  /** time stops: a reversed swell, a low hit and a glassy shimmer */
  freeze: () => {
    burst(0.25, 0.5, 400, 8000, 0.35, 0, [8000, 500]);
    setTimeout(() => {
      tone(70, 0.5, 1.1, "sine", 38);
      [2093, 2637, 3136].forEach((f, i) => setTimeout(() => tone(f, 0.04, 0.9, "sine", undefined, i - 1), i * 50));
    }, 330);
  },
  unfreeze: () => burst(0.22, 0.6, 400, 7000, 0.4, 0, [500, 7000]),
  /** a quiet, slowly breathing pad that keeps the frozen world alive */
  droneStart: () => {
    const c = audio();
    if (!c || !master || drone) return;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.09, c.currentTime + 1.5);
    const lp = c.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 600;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 0.12;
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(lp.frequency);
    const oscs = [55, 82.4, 110, 164.8].flatMap((f) =>
      [-4, 4].map((cents) => {
        const o = c.createOscillator();
        o.type = "sawtooth";
        o.frequency.value = f;
        o.detune.value = cents;
        o.connect(lp);
        return o;
      }),
    );
    lp.connect(g).connect(master);
    [...oscs, lfo].forEach((o) => o.start());
    drone = {
      stop: () => {
        const t = c.currentTime;
        g.gain.cancelScheduledValues(t);
        g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);
        [...oscs, lfo].forEach((o) => o.stop(t + 0.9));
      },
    };
  },
  droneStop: () => {
    drone?.stop();
    drone = null;
  },
};
