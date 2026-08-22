import { VersioningType } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { cleanupOpenApiDoc } from 'nestjs-zod'
import { AppModule } from './app.module'
import { APP_CONFIGURATION } from './shared/infrastructure/config/config.loader'
import type { Configuration } from './shared/infrastructure/config/config.schema'

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter(),
    {
      bodyParser: false,
    },
  )

  app.enableShutdownHooks()
  app.setGlobalPrefix('api')
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
  })

  const openApiDoc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Kirika API')
      .setDescription('Kirika App 的后端')
      .setVersion('1.0')
      .build(),
  )
  SwaggerModule.setup('docs', app, cleanupOpenApiDoc(openApiDoc), {
    jsonDocumentUrl: 'swagger/json',
  })

  const appConfig = app.get<Configuration>(APP_CONFIGURATION).app
  await app.listen(appConfig.port)
}
bootstrap()
