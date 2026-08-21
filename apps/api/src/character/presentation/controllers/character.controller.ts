import {
	Body,
	Controller,
	Delete,
	Get,
	HttpCode,
	HttpStatus,
	Param,
	ParseUUIDPipe,
	Patch,
	Post,
	Put,
	Query,
	Session,
} from '@nestjs/common'
import { CommandBus, QueryBus } from '@nestjs/cqrs'
import type { UserSession } from '@thallesp/nestjs-better-auth'
import { ZodResponse } from 'nestjs-zod'
import { PagedRequestParams } from '~/shared/presentation/api-request.interface'
import { CreateCharacterCommand } from '../../application/commands/create-character.command'
import { CreateCharacterRevisionCommand } from '../../application/commands/create-character-revision.command'
import { DeleteCharacterCommand } from '../../application/commands/delete-character.command'
import { PublishCharacterRevisionCommand } from '../../application/commands/publish-character-revision.command'
import { SyncCharacterRevisionCommand } from '../../application/commands/sync-character-revision.command'
import { UpdateCharacterCommand } from '../../application/commands/update-character.command'
import { GetCharacterQuery } from '../../application/queries/get-character.query'
import { GetMyCharactersQuery } from '../../application/queries/get-my-characters.query'
import { CharacterResponse } from '../dtos/character.response'
import { CreateCharacterRequest } from '../dtos/create-character.request'
import { GetCharactersResponse } from '../dtos/get-characters.response'
import { SyncCharacterRevisionRequest } from '../dtos/sync-character-revision.request'
import { UpdateCharacterRequest } from '../dtos/update-character.request'

@Controller({
	path: 'characters',
	version: ['1'],
})
export class CharacterController {
	constructor(
		private readonly commandBus: CommandBus,
		private readonly queryBus: QueryBus,
	) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	@ZodResponse({ type: CharacterResponse })
	async create(
		@Body() dto: CreateCharacterRequest,
		@Session() session: UserSession,
	) {
		const result = await this.commandBus.execute(
			new CreateCharacterCommand(session.user.id, dto.alias, dto.revision),
		)

		return CharacterResponse.fromResult(result, 201)
	}

	@Get()
	@ZodResponse({ type: GetCharactersResponse })
	async getMyCharacters(
		@Query() params: PagedRequestParams,
		@Session() session: UserSession,
	) {
		const result = await this.queryBus.execute(
			new GetMyCharactersQuery(session.user.id, params.page, params.pageSize),
		)

		return GetCharactersResponse.fromResult(result)
	}

	@Get(':id')
	@ZodResponse({ type: CharacterResponse })
	async getDetail(
		@Param('id', ParseUUIDPipe) id: string,
		@Session() session: UserSession,
	) {
		const result = await this.queryBus.execute(
			new GetCharacterQuery(id, session.user.id),
		)

		return CharacterResponse.fromResult(result)
	}

	@Patch(':id')
	@ZodResponse({ type: CharacterResponse })
	async update(
		@Param('id', ParseUUIDPipe) id: string,
		@Body() dto: UpdateCharacterRequest,
		@Session() session: UserSession,
	) {
		const result = await this.commandBus.execute(
			new UpdateCharacterCommand(id, session.user.id, dto.alias),
		)

		return CharacterResponse.fromResult(result)
	}

	@Delete(':id')
	@HttpCode(HttpStatus.NO_CONTENT)
	async delete(
		@Param('id', ParseUUIDPipe) id: string,
		@Session() session: UserSession,
	) {
		await this.commandBus.execute(
			new DeleteCharacterCommand(id, session.user.id),
		)
	}

	@Post(':id/revision')
	@HttpCode(HttpStatus.CREATED)
	@ZodResponse({ type: CharacterResponse })
	async createRevision(
		@Param('id', ParseUUIDPipe) id: string,
		@Session() session: UserSession,
	) {
		const result = await this.commandBus.execute(
			new CreateCharacterRevisionCommand(id, session.user.id),
		)

		return CharacterResponse.fromResult(result, 201)
	}

	@Put(':id/revisions/:revId')
	@ZodResponse({ type: CharacterResponse })
	async syncRevision(
		@Param('id', ParseUUIDPipe) id: string,
		@Param('revId', ParseUUIDPipe) revId: string,
		@Body() dto: SyncCharacterRevisionRequest,
		@Session() session: UserSession,
	) {
		const result = await this.commandBus.execute(
			new SyncCharacterRevisionCommand(id, revId, session.user.id, dto),
		)

		return CharacterResponse.fromResult(result)
	}

	@Post(':id/revisions/:revId/publish')
	@HttpCode(HttpStatus.OK)
	@ZodResponse({ type: CharacterResponse })
	async publishRevision(
		@Param('id', ParseUUIDPipe) id: string,
		@Param('revId', ParseUUIDPipe) revId: string,
		@Session() session: UserSession,
	) {
		const result = await this.commandBus.execute(
			new PublishCharacterRevisionCommand(id, revId, session.user.id),
		)

		return CharacterResponse.fromResult(result)
	}
}
