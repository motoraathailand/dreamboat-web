// DREAM BOAT — procedural ambient music & water sounds (Web Audio API).
// Everything here is synthesised at runtime by this project's own code. No samples, no external audio.
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const MOODS = [
  { // 1 Sunset River — D major, warm, slow, pentatonic glints
    bar: 7.5,
    chords: [[50, 57, 62, 66, 69], [47, 54, 62, 66, 71], [43, 50, 59, 62, 66], [45, 52, 59, 62, 64]],
    scale: [62, 64, 66, 69, 71, 74, 76, 78, 81],
    padType: 'sawtooth', padCut: 900, arpRate: 0.95, arpOct: 0, bell: 0, arpGain: 0.09,
  },
  { // 2 Golden Reeds — G mixolydian, airy open fifths, slow breathy plucks
    bar: 8.5,
    chords: [[43, 50, 57, 62, 67], [41, 48, 57, 62, 65], [48, 55, 62, 64, 67], [43, 50, 59, 62, 69]],
    scale: [62, 64, 65, 67, 69, 71, 72, 74, 76],
    padType: 'sine', padCut: 1100, arpRate: 1.25, arpOct: 0, bell: 0, arpGain: 0.08,
  },
  { // 3 Old Wooden Bridges — F major, kalimba-like plucks a little higher
    bar: 7.0,
    chords: [[41, 48, 57, 60, 64], [46, 53, 57, 62, 65], [38, 45, 57, 60, 65], [43, 50, 58, 62, 65]],
    scale: [65, 67, 69, 72, 74, 77, 79, 81],
    padType: 'triangle', padCut: 1000, arpRate: 0.62, arpOct: 0, bell: 0, arpGain: 0.075,
  },
  { // 4 Misty Valley — A dorian, very slow, sparse soft tones
    bar: 11.0,
    chords: [[45, 52, 59, 60, 64], [43, 50, 57, 59, 62], [41, 48, 55, 57, 64], [45, 52, 54, 59, 64]],
    scale: [57, 59, 60, 62, 64, 66, 69, 71],
    padType: 'sine', padCut: 750, arpRate: 1.9, arpOct: 0, bell: 0, arpGain: 0.065,
  },
  { // 5 Firefly Forest — E major 7 shimmer, quick tiny twinkles up high
    bar: 9.5,
    chords: [[40, 47, 56, 63, 66], [45, 52, 56, 61, 64], [37, 44, 56, 59, 63], [42, 49, 56, 61, 66]],
    scale: [68, 71, 73, 75, 76, 78, 80, 83],
    padType: 'triangle', padCut: 1200, arpRate: 0.42, arpOct: 12, bell: 1, arpGain: 0.045,
  },
  { // 6 Lantern Bridge — Eb lydian, twilight, music-box bells
    bar: 9.0,
    chords: [[51, 58, 62, 65, 69], [48, 55, 62, 63, 67], [44, 51, 60, 63, 67], [46, 53, 60, 62, 65]],
    scale: [63, 65, 67, 69, 70, 72, 74, 75, 77, 79, 82],
    padType: 'triangle', padCut: 1300, arpRate: 0.7, arpOct: 12, bell: 1, arpGain: 0.07,
  },
  { // 7 Starlight Lake — Db add9, wide and spacious, slow glassy bells
    bar: 10.5,
    chords: [[49, 56, 63, 65, 68], [46, 53, 61, 63, 68], [42, 49, 58, 61, 65], [44, 51, 60, 63, 66]],
    scale: [61, 63, 65, 68, 70, 73, 75, 77, 80],
    padType: 'sine', padCut: 950, arpRate: 1.35, arpOct: 12, bell: 1, arpGain: 0.06,
  },
  { // 8 Dawn Cloud Sea — C major, gently rising, brighter pad
    bar: 8.0,
    chords: [[48, 55, 64, 67, 72], [47, 55, 62, 67, 71], [45, 52, 60, 64, 71], [41, 48, 57, 64, 69]],
    scale: [60, 62, 64, 67, 69, 72, 74, 76, 79],
    padType: 'sawtooth', padCut: 1250, arpRate: 0.85, arpOct: 0, bell: 0, arpGain: 0.08,
  },
];

export class DreamAudio {
  constructor() { this.ctx = null; this.muted = false; this.mix = MOODS.map((_, i) => (i === 0 ? 1 : 0)); this.started = false; }

  start() {
    if (this.started) { this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC(); this.started = true;
    this.master = ctx.createGain(); this.master.gain.value = 0;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    this.master.gain.setTargetAtTime(this.muted ? 0 : 0.8, ctx.currentTime, 1.5);
    // reverb (generated impulse)
    this.reverb = ctx.createConvolver(); this.reverb.buffer = this.impulse(4.5, 2.6);
    this.revGain = ctx.createGain(); this.revGain.gain.value = 0.55; this.reverb.connect(this.revGain).connect(this.master);
    // feedback delay for plucks
    this.delay = ctx.createDelay(2); this.delay.delayTime.value = 0.62;
    const fb = ctx.createGain(); fb.gain.value = 0.38; const dl = ctx.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2200;
    this.delay.connect(dl).connect(fb).connect(this.delay); dl.connect(this.reverb);
    const dOut = ctx.createGain(); dOut.gain.value = 0.35; dl.connect(dOut).connect(this.master);
    // zone buses
    this.bus = MOODS.map((m, i) => {
      const g = ctx.createGain(); g.gain.value = this.mix[i]; g.connect(this.master); g.connect(this.reverb);
      return { gain: g, mood: m, nextBar: ctx.currentTime + 0.2, chord: 0, nextNote: ctx.currentTime + 1.5 + (i % 3) * 0.7, last: 4 };
    });
    // water ambience: looping filtered noise with slow swells
    const noise = ctx.createBufferSource(); noise.buffer = this.noiseBuffer(6, true); noise.loop = true;
    const nf = ctx.createBiquadFilter(); nf.type = 'lowpass'; nf.frequency.value = 520; nf.Q.value = 0.4;
    const ng = ctx.createGain(); ng.gain.value = 0.16;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.09; const lg = ctx.createGain(); lg.gain.value = 0.07; lfo.connect(lg).connect(ng.gain); lfo.start();
    noise.connect(nf).connect(ng).connect(this.master); noise.start();
    this.waterGain = ng;
    this.white = this.noiseBuffer(1.5, false);
    this.timer = setInterval(() => this.schedule(), 150);
    this.schedule();
  }

  impulse(sec, decay) {
    const ctx = this.ctx, len = Math.floor(sec * ctx.sampleRate), b = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay); }
    return b;
  }
  noiseBuffer(sec, brown) {
    const ctx = this.ctx, len = Math.floor(sec * ctx.sampleRate), b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    let last = 0; for (let i = 0; i < len; i++) { const w = Math.random() * 2 - 1; if (brown) { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w; }
    return b;
  }

  // crossfade between two zone moods (a -> b by w); only changes are sent to the audio graph
  setZone(a, b, w) {
    const mix = MOODS.map(() => 0); mix[a] += 1 - w; mix[b] += w;
    let changed = false; for (let i = 0; i < mix.length; i++) if (Math.abs(mix[i] - this.mix[i]) > 0.01) changed = true;
    if (!changed) return;
    this.mix = mix;
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.bus.forEach((b, i) => b.gain.gain.setTargetAtTime(this.mix[i], t, 1.2));
  }
  setMuted(m) {
    this.muted = m;
    if (this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.3);
  }
  setRowing(intensity) { if (this.ctx) this.waterGain.gain.setTargetAtTime(0.16 + intensity * 0.06, this.ctx.currentTime, 0.5); }
  fadeOutEnd(on) { if (this.ctx && !this.muted) this.master.gain.setTargetAtTime(on ? 0.45 : 0.8, this.ctx.currentTime, 2.0); }

  schedule() {
    const ctx = this.ctx; const now = ctx.currentTime, ahead = now + 1.2;
    this.bus.forEach((b, i) => {
      const live = this.mix[i] > 0.02;
      while (b.nextBar < ahead) {
        if (live) this.pad(b, b.nextBar);
        b.chord = (b.chord + 1) % b.mood.chords.length; b.nextBar += b.mood.bar;
      }
      while (b.nextNote < ahead) {
        if (live && Math.random() < 0.82) this.pluck(b, b.nextNote);
        const r = b.mood.arpRate * (live ? 1 : 4); b.nextNote += r * (Math.random() < 0.3 ? 2 : 1) * (0.9 + Math.random() * 0.25);
      }
    });
    // occasional water droplets
    if (Math.random() < 0.06) this.droplet(now + Math.random());
  }

  pad(b, t) {
    const ctx = this.ctx, m = b.mood, notes = m.chords[b.chord], dur = m.bar + 3.5;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 0.6;
    f.frequency.setValueAtTime(m.padCut * 0.5, t); f.frequency.linearRampToValueAtTime(m.padCut, t + m.bar * 0.5); f.frequency.linearRampToValueAtTime(m.padCut * 0.6, t + dur);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.05, t + 2.8); g.gain.setValueAtTime(0.05, t + m.bar - 0.5); g.gain.linearRampToValueAtTime(0, t + dur);
    f.connect(g).connect(b.gain);
    notes.forEach((n, k) => {
      for (const det of [-7, 6]) {
        const o = ctx.createOscillator(); o.type = k === 0 ? 'sine' : m.padType; o.frequency.value = mtof(n); o.detune.value = det + (Math.random() - 0.5) * 4;
        const og = ctx.createGain(); og.gain.value = k === 0 ? 0.9 : 0.32; o.connect(og).connect(f); o.start(t); o.stop(t + dur + 0.1);
      }
    });
  }

  pluck(b, t) {
    const ctx = this.ctx, m = b.mood;
    // gentle random walk over the scale, favouring chord tones
    let step = Math.round((Math.random() - 0.5) * 4); if (step === 0) step = Math.random() < 0.5 ? -1 : 2;
    b.last = Math.max(0, Math.min(m.scale.length - 1, b.last + step));
    const note = m.scale[b.last] + m.arpOct, freq = mtof(note);
    const g = ctx.createGain(); const peak = m.arpGain * (0.6 + Math.random() * 0.5);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0008, t + (m.bell ? 3.4 : 2.4));
    const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = freq; o.connect(g);
    const o2 = ctx.createOscillator(); o2.type = 'sine'; o2.frequency.value = freq * (m.bell ? 3.01 : 2.0);
    const g2 = ctx.createGain(); g2.gain.setValueAtTime(peak * (m.bell ? 0.45 : 0.25), t); g2.gain.exponentialRampToValueAtTime(0.0005, t + (m.bell ? 0.9 : 0.6));
    o2.connect(g2);
    const pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    const out = pan || ctx.createGain(); if (pan) pan.pan.value = (Math.random() - 0.5) * 0.9;
    g.connect(out); g2.connect(out); out.connect(b.gain); out.connect(this.delay);
    [o, o2].forEach(x => { x.start(t); x.stop(t + 3.6); });
  }

  droplet(t) {
    const ctx = this.ctx; const o = ctx.createOscillator(); o.type = 'sine';
    const f0 = 900 + Math.random() * 900; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f0 * 2.2, t + 0.07);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.018, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    o.connect(g).connect(this.reverb); g.connect(this.master); o.start(t); o.stop(t + 0.15);
  }

  splash(strength = 1) {
    if (!this.ctx) return; const ctx = this.ctx, t = ctx.currentTime + 0.02;
    const s = ctx.createBufferSource(); s.buffer = this.white;
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 0.9; f.frequency.setValueAtTime(1800, t); f.frequency.exponentialRampToValueAtTime(500, t + 0.5);
    const g = ctx.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.09 * strength, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0005, t + 0.7);
    s.connect(f).connect(g); g.connect(this.master); g.connect(this.reverb); s.start(t); s.stop(t + 0.8);
    // a few drips as the blades come out
    for (let i = 0; i < 3; i++) this.droplet(t + 0.55 + i * 0.12 + Math.random() * 0.1);
  }
}
