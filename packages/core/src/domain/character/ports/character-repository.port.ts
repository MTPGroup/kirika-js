import type { Character, CharacterId } from '../entities/character.entity'

export const CHARACTER_REPOSITORY_PORT = Symbol('CHARACTER_REPOSITORY_PORT')

export interface CharacterRepositoryPort {
  findById(id: CharacterId): Promise<Character | null>
  save(character: Character): Promise<void>
  delete(id: CharacterId): Promise<void>
}
