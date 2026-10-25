import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../shared/infrastructure/config/env.schema.js';
import {
  BootstrapMasterRealmUseCase,
  InitialAdmin,
} from '../application/use-cases/bootstrap-master-realm.use-case.js';

@Injectable()
export class MasterRealmBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(MasterRealmBootstrap.name);

  constructor(
    private readonly bootstrapMasterRealm: BootstrapMasterRealmUseCase,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const result = await this.bootstrapMasterRealm.execute(this.initialAdmin());
    if (result.status === 'created') {
      this.logger.log(
        `Created master realm with initial admin "${result.admin.username}"`,
      );
    }
  }

  private initialAdmin(): InitialAdmin | null {
    const username = this.config.get('GATEHOUSE_ADMIN_USERNAME', {
      infer: true,
    });
    const email = this.config.get('GATEHOUSE_ADMIN_EMAIL', { infer: true });
    const password = this.config.get('GATEHOUSE_ADMIN_PASSWORD', {
      infer: true,
    });
    if (!username || !email || !password) {
      return null;
    }
    return { username, email, password };
  }
}
