import { parseRange } from './range.util';

describe('parseRange', () => {
  it('returns null without a header', () => expect(parseRange(undefined, 100)).toBeNull());
  it('parses a closed range', () => expect(parseRange('bytes=0-9', 100)).toEqual({ start: 0, end: 9 }));
  it('parses an open-ended range', () => expect(parseRange('bytes=90-', 100)).toEqual({ start: 90, end: 99 }));
  it('clamps the end to the file size', () => expect(parseRange('bytes=50-500', 100)).toEqual({ start: 50, end: 99 }));
  it('parses a suffix range', () => expect(parseRange('bytes=-10', 100)).toEqual({ start: 90, end: 99 }));
  it('rejects a start past the end of the file', () => expect(parseRange('bytes=100-', 100)).toBe('invalid'));
  it('rejects garbage', () => {
    expect(parseRange('bytes=abc', 100)).toBe('invalid');
    expect(parseRange('bytes=-', 100)).toBe('invalid');
    expect(parseRange('bytes=9-2', 100)).toBe('invalid');
  });
});
