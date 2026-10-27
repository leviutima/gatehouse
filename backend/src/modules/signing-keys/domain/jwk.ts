export type EcPublicJwk = {
  kty: 'EC';
  crv: 'P-256';
  x: string;
  y: string;
};

export type PublishedJwk = EcPublicJwk & {
  kid: string;
  alg: string;
  use: 'sig';
};
