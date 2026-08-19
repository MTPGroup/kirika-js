import {
	Body,
	Controller,
	HttpCode,
	HttpStatus,
	Post,
	Session,
} from '@nestjs/common'
import { type UserSession } from '@thallesp/nestjs-better-auth'
import { CreateLorebookDto } from '~/lorebook/application/dtos/create-lorebook.dto'
import { CreateLorebookUseCase } from '~/lorebook/application/use-cases/create-lorebook.use-case'

@Controller('lorebook')
export class LorebookController {
	constructor(private readonly createLorebookUseCase: CreateLorebookUseCase) {}

	@Post()
	@HttpCode(HttpStatus.CREATED)
	createLorebook(
		@Body() dto: CreateLorebookDto,
		@Session() session: UserSession,
	) {
		this.createLorebookUseCase.execute(dto, session.user.id)
	}
}
