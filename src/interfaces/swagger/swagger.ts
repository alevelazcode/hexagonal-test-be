import { REFRESH_TOKEN_COOKIE_NAME } from '@interfaces/http/auth/auth.constants';
import { DocumentBuilder, type OpenAPIObject, SwaggerModule } from '@nestjs/swagger';

type SwaggerNestApplication = Parameters<typeof SwaggerModule.createDocument>[0];

export function createOpenApiDocument(app: unknown): OpenAPIObject {
  const config = new DocumentBuilder()
    .setTitle('Hex Test API')
    .setDescription('REST API')
    .setVersion('1.0.0')
    .addServer('http://localhost:3000')
    .addTag('Auth')
    .addTag('Health')
    .addBearerAuth()
    .addCookieAuth(REFRESH_TOKEN_COOKIE_NAME)
    .build();

  return SwaggerModule.createDocument(app as SwaggerNestApplication, config, {
    deepScanRoutes: true,
    ignoreGlobalPrefix: false,
  });
}

export function setupSwagger(app: unknown): void {
  const document = createOpenApiDocument(app);

  SwaggerModule.setup('docs', app as SwaggerNestApplication, document, {
    useGlobalPrefix: true,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}
