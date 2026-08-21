import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	NotImplementedException,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Put,
	Query,
	Session,
} from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import { OptionalAuth, type UserSession } from '@thallesp/nestjs-better-auth'
import { ZodResponse } from 'nestjs-zod'
import { CreateLorebookCommand } from '~/lorebook/application/commands/create-lorebook.command'
import { GetPublicLorebookQuery } from '~/lorebook/application/queries/get-available-lorebooks.query'
import { GetLorebookQuery } from '~/lorebook/application/queries/get-lorebook.query'
import { GetMyLorebooksQuery } from '~/lorebook/application/queries/get-my-lorebooks.query'
import { PagedRequestParams } from '~/shared/presentation/api-request.interface'
import { CreateLorebookRequest } from '../dtos/create-lorebook.request'
import { CreateLorebookResponse } from '../dtos/create-lorebook.response'
import { GetLorebookResponse } from '../dtos/get-lorebook.response'
import { GetLorebooksResponse } from '../dtos/get-lorebooks.response'

@Controller({
	path: 'lorebooks',
	version: ['1'],
})
export class LorebookController {
	constructor(
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus,
	) {}

	// 创建新世界书
	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ZodResponse({
		type: CreateLorebookResponse,
	})
	async createLorebook(
		@Body() dto: CreateLorebookRequest,
		@Session() session: UserSession,
	) {
		const result = await this.commandBus.execute(
			new CreateLorebookCommand(dto.name, dto.description, session.user.id),
		)

		return CreateLorebookResponse.fromResult(result)
	}

	// 获取当前用户的所有世界书列表
	@Get()
	@ZodResponse({
		type: GetLorebooksResponse,
	})
	async getMyLorebooks(
		@Query() params: PagedRequestParams,
		@Session() session: UserSession,
	) {
		const result = await this.queryBus.execute(
			new GetMyLorebooksQuery(session.user.id, params.page, params.pageSize),
		)

		return GetLorebooksResponse.fromResult(result)
	}

	@Get('avilable')
	@ZodResponse({
		type: GetLorebooksResponse,
	})
	@OptionalAuth()
	async getAvilableLorebooks(
		@Query() params: PagedRequestParams,
		@Session() session?: UserSession,
	) {
		const result = await this.queryBus.execute(
			new GetPublicLorebookQuery(
				params.page,
				params.pageSize,
				session?.user.id,
			),
		)

		return GetLorebooksResponse.fromResult(result)
	}

	// 获取指定世界书
	@Get(':id')
	@ZodResponse({
		type: GetLorebookResponse,
	})
	async getDetail(
		@Param('id', ParseUUIDPipe) id: string,
		@Session() session: UserSession,
	) {
		const result = await this.queryBus.execute(
			new GetLorebookQuery(id, session.user.id),
		)

		return GetLorebookResponse.fromResult(result)
	}

	// 更新主表数据
	@Patch(':id')
	async patch(@Param('id', ParseUUIDPipe) id: string) {
		throw new NotImplementedException()
	}

	// 删除指定的世界书
	@Delete(':id')
	async delete(@Param('id', ParseUUIDPipe) id: string) {
		throw new NotImplementedException()
	}

	// 基于当前版本新建一个Revision(draft)
	@Post(':id/revision')
	async createRevision(@Param('id', ParseUUIDPipe) id: string) {
		throw new NotImplementedException()
	}

	// 发布 revision
	@Post(':id/revisions/:revId/publish')
	async publish(
		@Param('id', ParseUUIDPipe) id: string,
		@Param('revId', ParseUUIDPipe) revId: string,
	) {
		throw new NotImplementedException()
	}

	@Put(':id/revisions/:revId/entries')
	async syncEntries(
		@Param('id', ParseUUIDPipe) id: string,
		@Param('revId', ParseUUIDPipe) revId: string,
	) {
		throw new NotImplementedException()
	}
}
