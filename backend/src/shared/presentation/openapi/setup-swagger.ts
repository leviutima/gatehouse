import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export const SWAGGER_PATH = 'docs';
export const ACCESS_TOKEN_SECURITY = 'access_token';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Gatehouse')
    .setDescription(
      'Identity provider: OAuth 2.0 and OpenID Connect endpoints per realm, and the admin API.',
    )
    .setVersion('0.0.1')
    .addBasicAuth(
      { type: 'http', scheme: 'basic', description: 'client_id:client_secret' },
      'client_secret_basic',
    )
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      ACCESS_TOKEN_SECURITY,
    )
    .build();

  SwaggerModule.setup(SWAGGER_PATH, app, () =>
    SwaggerModule.createDocument(app, config),
  );
}
