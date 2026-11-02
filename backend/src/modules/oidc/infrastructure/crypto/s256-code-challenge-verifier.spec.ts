import { S256CodeChallengeVerifier } from './s256-code-challenge-verifier.js';

const RFC_7636_VERIFIER = 'dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk';
const RFC_7636_CHALLENGE = 'E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM';

describe('S256CodeChallengeVerifier', () => {
  const verifier = new S256CodeChallengeVerifier();

  it('matches the example of RFC 7636', () => {
    expect(verifier.matches(RFC_7636_VERIFIER, RFC_7636_CHALLENGE)).toBe(true);
  });

  it('rejects another verifier', () => {
    expect(
      verifier.matches(
        `${RFC_7636_VERIFIER.slice(0, -1)}A`,
        RFC_7636_CHALLENGE,
      ),
    ).toBe(false);
  });

  it('rejects sending the challenge itself as the verifier', () => {
    expect(verifier.matches(RFC_7636_CHALLENGE, RFC_7636_CHALLENGE)).toBe(
      false,
    );
  });

  it.each([
    ['shorter than 43 characters', 'a'.repeat(42)],
    ['longer than 128 characters', 'a'.repeat(129)],
    ['with characters outside the allowed set', `${'a'.repeat(42)}+`],
  ])('rejects a verifier %s', (_case, codeVerifier) => {
    expect(verifier.matches(codeVerifier, RFC_7636_CHALLENGE)).toBe(false);
  });
});
