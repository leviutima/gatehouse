import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../shared/infrastructure/config/env.schema.js';
import { RealmIssuer } from '../application/realm-issuer.js';

@Injectable()
export class ConfigRealmIssuer extends RealmIssuer {
  private readonly baseUrl: string;

  constructor(config: ConfigService<Env, true>) {
    super();
    this.baseUrl = config.get('GATEHOUSE_ISSUER', { infer: true });
  }

  forRealm(realmName: string): string {
    return `${this.baseUrl}/realms/${encodeURIComponent(realmName)}`;
  }
}
