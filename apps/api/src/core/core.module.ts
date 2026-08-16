import { Module } from '@nestjs/common'
import { DatabaseModule } from './database/database.module'
import { MailerModule } from './mailer/mailer.module'

@Module({
	imports: [DatabaseModule, MailerModule],
	exports: [DatabaseModule, MailerModule],
})
export class CoreModule {}
