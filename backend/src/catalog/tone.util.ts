/**
 * Generates short original melodies as 16-bit mono WAV files.
 * Used ONLY to seed a development catalog, so the player can be tested with audio that nobody owns.
 * It is not a substitute for licensed music.
 */
const RATE = 22050;

// Semitone offsets from the root for a few scales.
export const SCALES: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11, 12],
  minor: [0, 2, 3, 5, 7, 8, 10, 12],
  pentatonic: [0, 2, 4, 7, 9, 12],
};

export interface ToneSpec {
  rootHz: number;
  scale: keyof typeof SCALES;
  seconds: number;
  /** Deterministic pattern seed so the same spec always gives the same audio. */
  seed: number;
  noteMs?: number;
}

function lcg(seed: number) {
  let s = seed >>> 0 || 1;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 0xffffffff);
}

export function makeWav(spec: ToneSpec): { wav: Buffer; durationMs: number } {
  const { rootHz, scale, seconds, seed, noteMs = 420 } = spec;
  const total = Math.floor(RATE * seconds);
  const samples = new Int16Array(total);
  const rand = lcg(seed);
  const steps = SCALES[scale];
  const noteLen = Math.floor((RATE * noteMs) / 1000);

  for (let start = 0, n = 0; start < total; start += noteLen, n++) {
    const semis = steps[Math.floor(rand() * steps.length)];
    const hz = rootHz * Math.pow(2, semis / 12);
    const len = Math.min(noteLen, total - start);
    for (let i = 0; i < len; i++) {
      const t = i / RATE;
      // Soft attack and release so notes do not click.
      const env = Math.min(1, i / (RATE * 0.02)) * Math.min(1, (len - i) / (RATE * 0.08));
      const v =
        0.6 * Math.sin(2 * Math.PI * hz * t) +
        0.25 * Math.sin(2 * Math.PI * hz * 2 * t) +
        0.15 * Math.sin(2 * Math.PI * hz * 0.5 * t);
      samples[start + i] = Math.round(v * env * 0.35 * 32767);
    }
  }

  const data = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // mono
  header.writeUInt32LE(RATE, 24);
  header.writeUInt32LE(RATE * 2, 28); // byte rate
  header.writeUInt16LE(2, 32); // block align
  header.writeUInt16LE(16, 34); // bits per sample
  header.write('data', 36);
  header.writeUInt32LE(data.length, 40);
  return { wav: Buffer.concat([header, data]), durationMs: Math.round((total / RATE) * 1000) };
}
