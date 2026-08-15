import type { ConfigType } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { appConfig } from './app.config'
import { AppModule } from './app.module'

async function bootstrap() {
	const app = await NestFactory.create(AppModule)

	const config = new DocumentBuilder()
		.setTitle('Kirika API')
		.setDescription('Kirika App 的后端')
		.setVersion('1.0')
		.build()
	const documentFactory = () => SwaggerModule.createDocument(app, config)
	SwaggerModule.setup('api', app, documentFactory, {
		jsonDocumentUrl: 'swagger/json',
	})

	const _appConfig = app.get<ConfigType<typeof appConfig>>(appConfig.KEY)
	await app.listen(_appConfig.port)
}
bootstrap()
