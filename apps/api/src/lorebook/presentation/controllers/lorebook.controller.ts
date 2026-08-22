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
import { OptionalAuth, type UserSession } from '@thallesp/nestjs-better-auth'
import { ZodResponse } from 'nestjs-zod'
import { CreateLorebookCommand } from '~/lorebook/application/commands/create-lorebook.command'
import { CreateLorebookRevisionCommand } from '~/lorebook/application/commands/create-lorebook-revision.command'
import { DeleteLorebookCommand } from '~/lorebook/application/commands/delete-lorebook.command'
import { PublishLorebookRevisionCommand } from '~/lorebook/application/commands/publish-lorebook-revision.command'
import { SyncLorebookEntriesCommand } from '~/lorebook/application/commands/sync-lorebook-entries.command'
import { UpdateLorebookCommand } from '~/lorebook/application/commands/update-lorebook.command'
import { GetPublicLorebookQuery } from '~/lorebook/application/queries/get-available-lorebooks.query'
import { GetLorebookQuery } from '~/lorebook/application/queries/get-lorebook.query'
import { GetMyLorebooksQuery } from '~/lorebook/application/queries/get-my-lorebooks.query'
import type { PagedRequestParams } from '~/shared/presentation/api-request.interface'
import type { CreateLorebookRequest } from '../dtos/create-lorebook.request'
import { CreateLorebookResponse } from '../dtos/create-lorebook.response'
import { GetLorebookResponse } from '../dtos/get-lorebook.response'
import { GetLorebooksResponse } from '../dtos/get-lorebooks.response'
import { LorebookRevisionResponse } from '../dtos/lorebook-revision.response'
import type { SyncLorebookEntriesRequest } from '../dtos/sync-lorebook-entries.request'
import type { UpdateLorebookRequest } from '../dtos/update-lorebook.request'
import { UpdateLorebookResponse } from '../dtos/update-lorebook.response'

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

  @Get(['available', 'avilable'])
  @ZodResponse({
    type: GetLorebooksResponse,
  })
  @OptionalAuth()
  async getAvailableLorebooks(
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
  @ZodResponse({
    type: UpdateLorebookResponse,
  })
  async patch(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLorebookRequest,
    @Session() session: UserSession,
  ) {
    const result = await this.commandBus.execute(
      new UpdateLorebookCommand(
        id,
        session.user.id,
        dto.name,
        dto.description,
        dto.visibility,
      ),
    )

    return UpdateLorebookResponse.fromResult(result)
  }

  // 删除指定的世界书
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: UserSession,
  ) {
    await this.commandBus.execute(
      new DeleteLorebookCommand(id, session.user.id),
    )
  }

  // 基于当前版本新建一个Revision(draft)
  @Post(':id/revision')
  @HttpCode(HttpStatus.CREATED)
  @ZodResponse({
    type: LorebookRevisionResponse,
  })
  async createRevision(
    @Param('id', ParseUUIDPipe) id: string,
    @Session() session: UserSession,
  ) {
    const result = await this.commandBus.execute(
      new CreateLorebookRevisionCommand(id, session.user.id),
    )

    return LorebookRevisionResponse.fromResult(result, 201)
  }

  // 发布 revision
  @Post(':id/revisions/:revId/publish')
  @HttpCode(HttpStatus.OK)
  @ZodResponse({
    type: LorebookRevisionResponse,
  })
  async publish(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revId', ParseUUIDPipe) revId: string,
    @Session() session: UserSession,
  ) {
    const result = await this.commandBus.execute(
      new PublishLorebookRevisionCommand(id, revId, session.user.id),
    )

    return LorebookRevisionResponse.fromResult(result)
  }

  @Put(':id/revisions/:revId/entries')
  @ZodResponse({
    type: LorebookRevisionResponse,
  })
  async syncEntries(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('revId', ParseUUIDPipe) revId: string,
    @Body() dto: SyncLorebookEntriesRequest,
    @Session() session: UserSession,
  ) {
    const result = await this.commandBus.execute(
      new SyncLorebookEntriesCommand(id, revId, session.user.id, dto.entries),
    )

    return LorebookRevisionResponse.fromResult(result)
  }
}
