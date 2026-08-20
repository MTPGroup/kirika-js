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
	Session,
} from '@nestjs/common'
import { CommandBus } from '@nestjs/cqrs'
import { type UserSession } from '@thallesp/nestjs-better-auth'
import { ZodResponse } from 'nestjs-zod'
import { CreateLorebookCommand } from '~/lorebook/application/commands/create-lorebook.command'
import { CreateLorebookRequest } from '../dtos/create-lorebook.request'
import { CreateLorebookResponse } from '../dtos/create-lorebook.response'

@Controller({
	path: 'lorebooks',
	version: ['1'],
})
export class LorebookController {
	constructor(private readonly commandBus: CommandBus) {}

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
	async getLorebookList() {
		throw new NotImplementedException()
	}

	// 获取指定世界书
	@Get(':id')
	async getDetail(@Param('id', ParseUUIDPipe) id: string) {
		throw new NotImplementedException()
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
