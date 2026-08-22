import type { LorebookRepositoryPort } from '@kirika-js/domain/lorebook'
import {
  Lorebook,
  LorebookEntry,
  type LorebookId,
} from '@kirika-js/domain/lorebook'
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common'
import { beforeEach, describe, expect, it } from 'vitest'
import { UserId } from '~/auth/user-id.vo'
import { UpdateLorebookCommand } from './update-lorebook.command'
import { UpdateLorebookHandler } from './update-lorebook.handler'

class InMemoryLorebookRepository implements LorebookRepositoryPort {
  savedLorebook: Lorebook | null = null

  constructor(public lorebook: Lorebook | null) {}

  async findById(_id: LorebookId): Promise<Lorebook | null> {
    return this.lorebook
  }

  async save(lorebook: Lorebook): Promise<void> {
    this.savedLorebook = lorebook
  }

  async delete(_id: LorebookId): Promise<void> {}
}

describe('UpdateLorebookHandler', () => {
  let ownerId: string
  let lorebook: Lorebook
  let repository: InMemoryLorebookRepository
  let handler: UpdateLorebookHandler

  beforeEach(() => {
    ownerId = crypto.randomUUID()
    lorebook = Lorebook.create('旧名称', '旧描述', new UserId(ownerId))
    repository = new InMemoryLorebookRepository(lorebook)
    handler = new UpdateLorebookHandler(repository)
  })

  it('部分更新元数据并保留未提供字段', async () => {
    const result = await handler.execute(
      new UpdateLorebookCommand(lorebook.id.value, ownerId, '新名称'),
    )

    expect(result).toMatchObject({
      id: lorebook.id.value,
      ownerId,
      name: '新名称',
      description: '旧描述',
      visibility: 'private',
    })
    expect(repository.savedLorebook).toBe(lorebook)
  })

  it('拒绝非所有者更新', async () => {
    await expect(
      handler.execute(
        new UpdateLorebookCommand(
          lorebook.id.value,
          crypto.randomUUID(),
          '新名称',
        ),
      ),
    ).rejects.toBeInstanceOf(ForbiddenException)
    expect(repository.savedLorebook).toBeNull()
  })

  it('更新不存在的世界书时返回 404', async () => {
    repository.lorebook = null

    await expect(
      handler.execute(
        new UpdateLorebookCommand(lorebook.id.value, ownerId, '新名称'),
      ),
    ).rejects.toBeInstanceOf(NotFoundException)
  })

  it('没有已发布版本时拒绝切换公开范围', async () => {
    await expect(
      handler.execute(
        new UpdateLorebookCommand(
          lorebook.id.value,
          ownerId,
          undefined,
          undefined,
          'public',
        ),
      ),
    ).rejects.toBeInstanceOf(BadRequestException)
    expect(repository.savedLorebook).toBeNull()
  })

  it('存在已发布版本时允许切换公开范围', async () => {
    const draft = lorebook.draftRevision
    if (!draft) throw new Error('测试世界书缺少草稿版本')

    draft.upsertEntry(
      LorebookEntry.create(
        ['关键词'],
        '条目',
        true,
        '条目内容',
        'after_history',
        0,
      ),
    )
    lorebook.publishRevision(draft.id)

    const result = await handler.execute(
      new UpdateLorebookCommand(
        lorebook.id.value,
        ownerId,
        undefined,
        undefined,
        'public',
      ),
    )

    expect(result.visibility).toBe('public')
    expect(repository.savedLorebook?.visibility).toBe('public')
  })
})
