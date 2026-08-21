import { ForbiddenException, NotFoundException } from '@nestjs/common'
import type { Character } from '../../domain/character.entity'
import { CharacterId } from '../../domain/character.entity'
import type { CharacterRepositoryPort } from '../../domain/ports/character-repository.port'

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
