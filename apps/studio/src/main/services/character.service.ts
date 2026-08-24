import { readFile, writeFile } from 'node:fs/promises'
import {
  AssetId,
  Character,
  CharacterId,
  CharacterLorebookReference,
  CharacterRevisionAsset,
  CharacterRevisionId,
} from '@kirika-js/domain/character'
import { LorebookRevisionId } from '@kirika-js/domain/lorebook'
import type { CharacterApi, CharacterDto } from '~/shared/ipc'
import {
  toCharacterDto,
  toCharacterSummaryDto,
} from '../mappers/ipc-dto.mapper'
import { studioRuntime } from '../studio-runtime'

type CharacterService = Omit<
  CharacterApi,
  'importCharacterCard' | 'exportCharacterCard'
> &
  Pick<CharacterApi, 'importCharacterCard' | 'exportCharacterCard'>

async function load(id: string) {
  const runtime = studioRuntime.requireActive()
  const character = await runtime.characterRepository.findById(
    new CharacterId(id),
  )
  if (!character) throw new Error('角色不存在')
  return { runtime, character }
}
function draftId(character: Character): CharacterRevisionId {
  const id = character.draftRevision?.id
  if (!id) throw new Error('角色不存在草稿版本')
  return id
}
async function save(
  runtime: ReturnType<typeof studioRuntime.requireActive>,
  character: Character,
): Promise<CharacterDto> {
  await runtime.characterRepository.save(character)
  return toCharacterDto(character)
}

export const characterService: CharacterService = {
  async listCharacters() {
    return (await studioRuntime.requireActive().characterRepository.findAll())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(toCharacterSummaryDto)
  },
  async createCharacter(input) {
    const runtime = studioRuntime.requireActive()
    const character = Character.create({
      ownerId: new (await import('@kirika-js/domain/shared')).UserId(
        runtime.settings.ownerId,
      ),
      alias: input.alias,
      initialRevision: input,
    })
    return save(runtime, character)
  },
  async getCharacter(input) {
    const value = await studioRuntime
      .requireActive()
      .characterRepository.findById(new CharacterId(input.characterId))
    return value ? toCharacterDto(value) : null
  },
  async deleteCharacter(input) {
    await studioRuntime
      .requireActive()
      .characterRepository.delete(new CharacterId(input.characterId))
  },
  async updateCharacterDraft(input) {
    const { runtime, character } = await load(input.characterId)
    character.updateDraftContent(draftId(character), input.patch)
    return save(runtime, character)
  },
  async replaceCharacterGreetings(input) {
    const { runtime, character } = await load(input.characterId)
    character.replaceDraftGreetings(draftId(character), input.greetings)
    return save(runtime, character)
  },
  async replaceCharacterExamples(input) {
    const { runtime, character } = await load(input.characterId)
    character.replaceDraftExamples(draftId(character), input.examples)
    return save(runtime, character)
  },
  async replaceCharacterAssets(input) {
    const { runtime, character } = await load(input.characterId)
    const assets = input.assets.map(
      (a) =>
        new CharacterRevisionAsset({
          assetId: new AssetId(a.assetId),
          kind: a.kind,
          name: a.name,
          uri: a.uri,
          ordinal: a.ordinal,
          extensions: a.extensions,
        }),
    )
    character.replaceDraftAssets(draftId(character), assets)
    return save(runtime, character)
  },
  async replaceCharacterLorebooks(input) {
    const { runtime, character } = await load(input.characterId)
    const availableRevisions = new Map(
      (await runtime.lorebookRepository.findAll()).flatMap((book) =>
        book.revisions.map(
          (revision) => [revision.id.value, revision] as const,
        ),
      ),
    )
    for (const reference of input.lorebooks) {
      const revision = availableRevisions.get(reference.lorebookRevisionId)
      if (!revision) throw new Error('引用的世界书版本不存在')
      if (revision.isDraft) throw new Error('角色只能引用已发布的世界书版本')
    }
    const refs = input.lorebooks.map(
      (r) =>
        new CharacterLorebookReference({
          lorebookRevisionId: new LorebookRevisionId(r.lorebookRevisionId),
          ordinal: r.ordinal,
          enabled: r.enabled,
        }),
    )
    character.replaceDraftLorebooks(draftId(character), refs)
    return save(runtime, character)
  },
  async createCharacterDraft(input) {
    const { runtime, character } = await load(input.characterId)
    character.createNewDraftRevision()
    return save(runtime, character)
  },
  async publishCharacterRevision(input) {
    const { runtime, character } = await load(input.characterId)
    character.publishRevision(new CharacterRevisionId(input.revisionId))
    return save(runtime, character)
  },
  async importCharacterCard(input) {
    if (input.formatHint && input.formatHint !== 'json')
      throw new Error('当前仅内置 JSON 角色卡 codec')
    const raw = JSON.parse(await readFile(input.filePath, 'utf8')) as Record<
      string,
      unknown
    >
    const runtime = studioRuntime.requireActive()
    const character = Character.create({
      ownerId: new (await import('@kirika-js/domain/shared')).UserId(
        runtime.settings.ownerId,
      ),
      initialRevision: raw as never,
    })
    return save(runtime, character)
  },
  async exportCharacterCard(input) {
    const { character } = await load(input.characterId)
    const revision = input.revisionId
      ? character.findRevision(new CharacterRevisionId(input.revisionId))
      : (character.currentRevision ?? character.draftRevision)
    if (!revision) throw new Error('角色版本不存在')
    if (input.format !== 'json') throw new Error('当前仅内置 JSON 角色卡 codec')
    const document = {
      name: revision.name,
      description: revision.description,
      personality: revision.personality,
      scenario: revision.scenario,
      systemPrompt: revision.systemPrompt,
      postHistoryInstructions: revision.postHistoryInstructions,
      greetings: revision.greetings,
      examples: revision.examples,
      extensions: revision.extensions,
      assets: [],
      lorebooks: [],
    }
    await writeFile(
      input.destinationPath,
      JSON.stringify(document, null, 2),
      'utf8',
    )
    return {
      filePath: input.destinationPath,
      format: 'json',
      mediaType: 'application/json',
    }
  },
}
