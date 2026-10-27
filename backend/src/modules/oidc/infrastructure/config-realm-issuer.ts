import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../shared/infrastructure/config/env.schema.js';
import { RealmIssuer } from '../application/realm-issuer.js';

@Injectable()
export class ConfigRealmIssuer extends RealmIssuer {
  private readonly realmsUrl: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.realmsUrl = `${config.get('GATEHOUSE_ISSUER', { infer: true })}/realms/`;
  }

  forRealm(realmName: string): string {
    return `${this.realmsUrl}${encodeURIComponent(realmName)}`;
  }

  realmNameOf(issuer: string): string | null {
    if (!issuer.startsWith(this.realmsUrl)) {
      return null;
    }
    let realmName: string;
    try {
      realmName = decodeURIComponent(issuer.slice(this.realmsUrl.length));
    } catch {
      return null;
    }
    return realmName && this.forRealm(realmName) === issuer ? realmName : null;
  }
}
