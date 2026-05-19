import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AudioService {
  private ctx: AudioContext | null = null;

  private get ac(): AudioContext {
    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  }

  // ── Primitive builders ───────────────────────────────────────────

  private noiseBuf(ctx: AudioContext, seconds: number): AudioBuffer {
    const n = Math.ceil(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private playNoise(
    ctx: AudioContext,
    t: number,
    duration: number,
    startGain: number,
    endGain: number,
    filterType: BiquadFilterType,
    filterStart: number,
    filterEnd: number,
    dest: AudioNode = ctx.destination
  ): void {
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf(ctx, duration);

    const filt = ctx.createBiquadFilter();
    filt.type = filterType;
    filt.frequency.setValueAtTime(filterStart, t);
    if (filterEnd !== filterStart) {
      filt.frequency.exponentialRampToValueAtTime(Math.max(filterEnd, 20), t + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(startGain, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(endGain, 0.0001), t + duration);

    src.connect(filt);
    filt.connect(gain);
    gain.connect(dest);
    src.start(t);
    src.stop(t + duration + 0.01);
  }

  private playTone(
    ctx: AudioContext,
    t: number,
    duration: number,
    freqStart: number,
    freqEnd: number,
    startGain: number,
    type: OscillatorType = 'sine',
    dest: AudioNode = ctx.destination
  ): void {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, t);
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 10), t + duration);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(startGain, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(t);
    osc.stop(t + duration + 0.01);
  }

  // ── Public sounds ────────────────────────────────────────────────

  /** Cannon boom — plays when any shot is fired. */
  playFire(): void {
    const ctx = this.ac;
    const t = ctx.currentTime;

    // Sharp crack (high-freq noise burst)
    this.playNoise(ctx, t, 0.06, 1.0, 0.001, 'bandpass', 3000, 3000);

    // Deep boom sweep
    this.playTone(ctx, t, 0.45, 90, 18, 0.9, 'sine');

    // Low rumble tail
    this.playNoise(ctx, t + 0.05, 0.35, 0.35, 0.001, 'lowpass', 120, 60);
  }

  /** Water splash — shot missed. */
  playSplash(): void {
    const ctx = this.ac;
    const t = ctx.currentTime;

    // Rushing water (bandpass sweep high → low)
    this.playNoise(ctx, t, 0.65, 0.55, 0.001, 'bandpass', 1800, 280);

    // Water plop (short descending tone)
    this.playTone(ctx, t, 0.18, 220, 45, 0.35, 'sine');
  }

  /** Metal impact — shot hit a ship. */
  playHit(): void {
    const ctx = this.ac;
    const t = ctx.currentTime;

    // Explosion noise (lowpass sweeps down)
    this.playNoise(ctx, t, 0.55, 0.75, 0.001, 'lowpass', 4000, 180);

    // Metallic thud
    this.playTone(ctx, t, 0.3, 160, 28, 0.65, 'sine');

    // Metal ring (higher pitch decay)
    this.playTone(ctx, t, 0.25, 420, 380, 0.25, 'triangle');
  }

  /** Large explosion — ship sunk. */
  playExplosion(): void {
    const ctx = this.ac;
    const t = ctx.currentTime;

    // Primary blast
    this.playNoise(ctx, t, 1.8, 1.0, 0.001, 'lowpass', 5000, 60);

    // Deep concussion boom
    this.playTone(ctx, t, 1.1, 55, 12, 1.0, 'sine');

    // Secondary explosion (delayed)
    this.playNoise(ctx, t + 0.12, 1.2, 0.65, 0.001, 'lowpass', 2500, 80);
    this.playTone(ctx, t + 0.12, 0.9, 40, 10, 0.6, 'sine');

    // High crack on impact
    this.playNoise(ctx, t, 0.08, 0.9, 0.001, 'bandpass', 3500, 3500);
  }

  /** Triumphant ascending fanfare — player wins. */
  playVictory(): void {
    const ctx = this.ac;
    const t = ctx.currentTime;
    // Ascending major arpeggio: C5 E5 G5 C6, then hold a chord
    const notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, i) => {
      this.playTone(ctx, t + i * 0.18, 0.55, freq, freq * 0.98, 0.35, 'triangle');
      // Soft harmonics underneath
      this.playTone(ctx, t + i * 0.18, 0.5, freq / 2, freq / 2, 0.15, 'sine');
    });
    // Final held chord (C major)
    [523.25, 659.25, 783.99].forEach(freq => {
      this.playTone(ctx, t + 0.75, 1.4, freq, freq * 0.97, 0.25, 'triangle');
    });
    // Sparkle shimmer on top
    this.playNoise(ctx, t + 0.7, 1.0, 0.12, 0.001, 'highpass', 4000, 6000);
  }

  /** Sombre descending dirge — player loses. */
  playDefeat(): void {
    const ctx = this.ac;
    const t = ctx.currentTime;
    // Descending minor: A4 F4 D4 A3
    const notes = [440, 349.23, 293.66, 220];
    notes.forEach((freq, i) => {
      this.playTone(ctx, t + i * 0.28, 0.7, freq, freq * 0.95, 0.3, 'triangle');
      this.playTone(ctx, t + i * 0.28, 0.65, freq / 2, freq / 2, 0.12, 'sine');
    });
    // Low ominous rumble
    this.playNoise(ctx, t + 0.5, 1.6, 0.25, 0.001, 'lowpass', 140, 50);
    this.playTone(ctx, t + 0.8, 1.5, 60, 30, 0.4, 'sine');
  }

  /** Short low thud for the computer's cannon (slightly muffled = distant). */
  playEnemyFire(): void {
    const ctx = this.ac;
    const t = ctx.currentTime;

    this.playNoise(ctx, t, 0.04, 0.5, 0.001, 'bandpass', 1800, 1800);
    this.playTone(ctx, t, 0.3, 65, 16, 0.55, 'sine');
    this.playNoise(ctx, t + 0.04, 0.22, 0.2, 0.001, 'lowpass', 90, 50);
  }
}
