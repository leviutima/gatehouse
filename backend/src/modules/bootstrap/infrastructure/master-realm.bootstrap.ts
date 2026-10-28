import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Env } from '../../../shared/infrastructure/config/env.schema.js';
import {
  BootstrapMasterRealmUseCase,
  InitialAdmin,
} from '../application/use-cases/bootstrap-master-realm.use-case.js';
import { EnsureAdminConsoleClientUseCase } from '../application/use-cases/ensure-admin-console-client.use-case.js';

@Injectable()
export class MasterRealmBootstrap implements OnApplicationBootstrap {
  private readonly logger = new Logger(MasterRealmBootstrap.name);

  constructor(
    private readonly bootstrapMasterRealm: BootstrapMasterRealmUseCase,
    private readonly ensureAdminConsoleClient: EnsureAdminConsoleClientUseCase,
    private readonly config: ConfigService<Env, true>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const result = await this.bootstrapMasterRealm.execute(this.initialAdmin());
    if (result.status === 'created') {
      this.logger.log(
        `Created master realm with initial admin "${result.admin.username}"`,
      );
    }
    if (result.status === 'admin_recovered') {
      this.logger.warn(
        `Master realm had no admin; granted the admin role to "${result.admin.username}"`,
      );
    }

    const consoleUrl = this.config.get('GATEHOUSE_ADMIN_CONSOLE_URL', {
      infer: true,
    });
    if (
      consoleUrl &&
      (await this.ensureAdminConsoleClient.execute(consoleUrl)) === 'created'
    ) {
      this.logger.log(`Created the admin console client for ${consoleUrl}`);
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
