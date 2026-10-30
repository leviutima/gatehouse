export abstract class CodeChallengeVerifier {
  abstract matches(codeVerifier: string, codeChallenge: string): boolean;
}
