import { makeWav } from './tone.util';

describe('makeWav', () => {
  const spec = { rootHz: 220, scale: 'minor', seconds: 2, seed: 7 } as const;

  it('writes a valid PCM WAV header and the right length', () => {
    const { wav, durationMs } = makeWav(spec);
    expect(wav.toString('ascii', 0, 4)).toBe('RIFF');
    expect(wav.toString('ascii', 8, 12)).toBe('WAVE');
    expect(wav.readUInt32LE(4)).toBe(wav.length - 8);
    expect(wav.readUInt32LE(40)).toBe(wav.length - 44);
    expect(durationMs).toBe(2000);
  });

  it('is deterministic for the same seed and differs for another', () => {
    expect(makeWav(spec).wav.equals(makeWav(spec).wav)).toBe(true);
    expect(makeWav({ ...spec, seed: 8 }).wav.equals(makeWav(spec).wav)).toBe(false);
  });

  it('is not silent and does not clip', () => {
    const { wav } = makeWav(spec);
    let peak = 0;
    for (let i = 44; i < wav.length; i += 2) peak = Math.max(peak, Math.abs(wav.readInt16LE(i)));
    expect(peak).toBeGreaterThan(1000);
    expect(peak).toBeLessThan(32767);
  });
});
