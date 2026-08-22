import { Module } from '@nestjs/common'
import { APP_CONFIGURATION, loadConfiguration } from './config.loader'

@Module({
  providers: [
    {
      provide: APP_CONFIGURATION,
      useFactory: loadConfiguration,
    },
  ],
  exports: [APP_CONFIGURATION],
})
export class AppConfigModule {}
