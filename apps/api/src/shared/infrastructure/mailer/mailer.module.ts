import { Module } from '@nestjs/common'
import { MailerModule as MMailerModule } from '@nestjs-modules/mailer'
import { APP_CONFIGURATION } from '../config/config.loader'
import { AppConfigModule } from '../config/config.module'
import type { Configuration } from '../config/config.schema'
import { AuthMailerService } from './auth-mailer.service'
import { createMailerOptions } from './mailer.factory'

@Module({
  imports: [
    MMailerModule.forRootAsync({
      imports: [AppConfigModule],
      inject: [APP_CONFIGURATION],
      useFactory: (config: Configuration) => {
        return createMailerOptions(config.mailer)
      },
    }),
  ],
  providers: [AuthMailerService],
  exports: [AuthMailerService],
})
export class MailerModule {}
