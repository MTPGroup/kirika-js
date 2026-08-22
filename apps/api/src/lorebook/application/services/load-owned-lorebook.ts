import type { LorebookRepositoryPort } from '@kirika-js/domain/lorebook'
import { type Lorebook, LorebookId } from '@kirika-js/domain/lorebook'
import { ForbiddenException, NotFoundException } from '@nestjs/common'

export async function loadOwnedLorebook(
  repository: LorebookRepositoryPort,
  lorebookId: string,
  requesterId: string,
): Promise<Lorebook> {
  const lorebook = await repository.findById(new LorebookId(lorebookId))

  if (!lorebook) {
    throw new NotFoundException('世界书不存在')
  }

  if (lorebook.ownerId.value !== requesterId) {
    throw new ForbiddenException('无权操作该世界书')
  }

  return lorebook
}
