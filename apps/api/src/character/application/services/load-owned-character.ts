import type {
  Character,
  CharacterRepositoryPort,
} from '@kirika-js/core/domain/character'
import { CharacterId } from '@kirika-js/core/domain/character'
import { ForbiddenException, NotFoundException } from '@nestjs/common'

export async function loadOwnedCharacter(
  repository: CharacterRepositoryPort,
  characterId: string,
  requesterId: string,
): Promise<Character> {
  const character = await repository.findById(new CharacterId(characterId))

  if (!character) throw new NotFoundException('角色不存在')
  if (character.ownerId.value !== requesterId) {
    throw new ForbiddenException('无权操作该角色')
  }

  return character
}
