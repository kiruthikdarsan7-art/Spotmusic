import { hashPassword, newOpaqueToken, sha256, verifyPassword } from './crypto.util';

describe('crypto.util', () => {
  it('verifies the right password and rejects a wrong one', async () => {
    const stored = await hashPassword('correct horse battery');
    expect(await verifyPassword('correct horse battery', stored)).toBe(true);
    expect(await verifyPassword('wrong password!!', stored)).toBe(false);
  });

  it('salts every hash differently', async () => {
    expect(await hashPassword('same-password-1')).not.toEqual(await hashPassword('same-password-1'));
  });

  it('rejects malformed stored hashes', async () => {
    expect(await verifyPassword('x', 'plaintext')).toBe(false);
  });

  it('produces unique opaque tokens and stable hashes', () => {
    expect(newOpaqueToken()).not.toEqual(newOpaqueToken());
    expect(sha256('a')).toEqual(sha256('a'));
    expect(sha256('a')).toHaveLength(64);
  });
});
