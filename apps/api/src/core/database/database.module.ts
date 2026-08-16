import {
	type DynamicModule,
	type FactoryProvider,
	Module,
	type ModuleMetadata,
} from '@nestjs/common'
import { DatabaseService } from './database.service'
import { DATABASE_OPTIONS, type DatabaseOptions } from './database.types'

export interface DatabaseModuleAsyncOptions
	extends Pick<ModuleMetadata, 'imports'> {
	inject?: FactoryProvider<DatabaseOptions>['inject']
	useFactory: FactoryProvider<DatabaseOptions>['useFactory']
}

@Module({})
// biome-ignore lint/complexity/noStaticOnlyClass: NestJS 动态模块需要静态方法
export class DatabaseModule {
	static forRootAsync(options: DatabaseModuleAsyncOptions): DynamicModule {
		return {
			module: DatabaseModule,
			imports: options.imports,
			providers: [
				{
					provide: DATABASE_OPTIONS,
					inject: options.inject,
					useFactory: options.useFactory,
				},
				DatabaseService,
			],
			exports: [DatabaseService],
		}
	}
}
