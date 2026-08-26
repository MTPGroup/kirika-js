import type {
  CharacterId,
  CharacterLorebookReference,
  CharacterRepositoryPort,
  CharacterRevisionAsset,
  CharacterRevisionContent,
  CharacterRevisionPatch,
} from '@kirika-js/core/domain/character'
import { Character } from '@kirika-js/core/domain/character'
import type { UserId } from '@kirika-js/core/domain/shared'

export interface CreateCharacterInput {
  readonly alias?: string | null
  readonly content: CharacterRevisionContent
}

export class CharacterService {
  constructor(private readonly repo: CharacterRepositoryPort) {}

  async create(
    ownerId: UserId,
    input: CreateCharacterInput,
  ): Promise<Character> {
    const character = Character.create({
      ownerId,
      alias: input.alias ?? null,
      initialRevision: input.content,
    })
    await this.repo.save(character)
    return character
  }

  async get(id: CharacterId): Promise<Character | null> {
    return this.repo.findById(id)
  }

  async updateDraft(
    character: Character,
    patch: CharacterRevisionPatch,
  ): Promise<Character> {
    const draft = character.draftRevision
    if (!draft) throw new Error('角色没有草稿版本')
    character.updateDraftContent(draft.id, patch)
    await this.repo.save(character)
    return character
  }

  async createNewDraft(character: Character): Promise<Character> {
    character.createNewDraftRevision()
    await this.repo.save(character)
    return character
  }

  async replaceDraftAssets(
    character: Character,
    assets: readonly CharacterRevisionAsset[],
  ): Promise<Character> {
    const draft = character.draftRevision
    if (!draft) throw new Error('角色没有草稿版本')
    character.replaceDraftAssets(draft.id, assets)
    await this.repo.save(character)
    return character
  }

  async replaceDraftLorebooks(
    character: Character,
    lorebooks: readonly CharacterLorebookReference[],
  ): Promise<Character> {
    const draft = character.draftRevision
    if (!draft) throw new Error('角色没有草稿版本')
    character.replaceDraftLorebooks(draft.id, lorebooks)
    await this.repo.save(character)
    return character
  }

  async publish(character: Character): Promise<Character> {
    const draft = character.draftRevision
    if (!draft) throw new Error('角色没有草稿版本')
    character.publishRevision(draft.id)
    await this.repo.save(character)
    return character
  }

  async remove(id: CharacterId): Promise<void> {
    await this.repo.delete(id)
  }
}
