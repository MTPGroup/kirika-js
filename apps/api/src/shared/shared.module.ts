import { Module } from '@nestjs/common'
import { APP_CONFIGURATION } from './infrastructure/config/config.loader'
import { AppConfigModule } from './infrastructure/config/config.module'
import type { Configuration } from './infrastructure/config/config.schema'
import { DrizzleModule } from './infrastructure/drizzle/drizzle.module'
import { MailerModule } from './infrastructure/mailer/mailer.module'

@Module({
  imports: [
    AppConfigModule,
    DrizzleModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [APP_CONFIGURATION],
      useFactory: (configuration: Configuration) => configuration.database,
    }),
    MailerModule,
  ],
  exports: [DrizzleModule, MailerModule, AppConfigModule],
})
export class SharedModule {}
