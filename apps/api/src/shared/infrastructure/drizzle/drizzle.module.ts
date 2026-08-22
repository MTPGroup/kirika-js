import {
  type DynamicModule,
  type FactoryProvider,
  Module,
  type ModuleMetadata,
} from '@nestjs/common'
import { DRIZZLE_OPTIONS } from './drizzle.constant'
import { DrizzleService } from './drizzle.service'
import type { DatabaseOptions } from './drizzle.types'

export interface DatabaseModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: FactoryProvider<DatabaseOptions>['inject']
  useFactory: FactoryProvider<DatabaseOptions>['useFactory']
}

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS 动态模块需要静态方法
export class DrizzleModule {
  static forRootAsync(options: DatabaseModuleAsyncOptions): DynamicModule {
    return {
      module: DrizzleModule,
      imports: options.imports,
      providers: [
        {
          provide: DRIZZLE_OPTIONS,
          inject: options.inject,
          useFactory: options.useFactory,
        },
        DrizzleService,
      ],
      exports: [DrizzleService],
    }
  }
}
