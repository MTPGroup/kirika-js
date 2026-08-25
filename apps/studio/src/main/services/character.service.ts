import { createHash, randomUUID } from 'node:crypto'
import { readFile, stat, writeFile } from 'node:fs/promises'
import { basename, extname } from 'node:path'
import {
  type CharacterCardCodec,
  CharacterCardCodecRegistry,
  createCharacterCardDocument,
  fromCharacterRevision,
  toCharacterRevisionContent,
} from '@kirika-js/core/character-card'
import {
  Asset,
  AssetId,
  Character,
  CharacterId,
  CharacterLorebookReference,
  CharacterRevisionAsset,
  CharacterRevisionId,
} from '@kirika-js/core/domain/character'
import {
  Lorebook,
  LorebookEntry,
  LorebookRevisionId,
} from '@kirika-js/core/domain/lorebook'
import type {
  CharacterApi,
  CharacterDto,
  LorebookEntryInput,
} from '~/shared/ipc'
import {
  toCharacterDto,
  toCharacterSummaryDto,
} from '../mappers/ipc-dto.mapper'
import { studioRuntime } from '../studio-runtime'
import { showOpenDialog, showSaveDialog } from './dialog.service'

const MAX_CHARACTER_CARD_BYTES = 10 * 1024 * 1024
const MAX_EMBEDDED_ASSET_BYTES = 25 * 1024 * 1024
const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder('utf-8', { fatal: true })
const jsonCodec: CharacterCardCodec = {
  format: 'json',
  canDecode(source) {
    return (
      source.mediaType === 'application/json' ||
      source.fileName?.toLocaleLowerCase().endsWith('.json') === true
    )
  },
  decode(source) {
    try {
      return JSON.parse(textDecoder.decode(source.data), (_key, value) => {
        if (
          value &&
          typeof value === 'object' &&
          Object.keys(value).length === 1 &&
          typeof value.$bytes === 'string'
        )
          return Uint8Array.from(Buffer.from(value.$bytes, 'base64'))
        return value
      }) as never
    } catch (error) {
      throw new Error('角色卡 JSON 格式无效', { cause: error })
    }
  },
  encode(card) {
    return {
      data: textEncoder.encode(
        JSON.stringify(
          card,
          (_key, value) =>
            value instanceof Uint8Array
              ? { $bytes: Buffer.from(value).toString('base64') }
              : value,
          2,
        ),
      ),
      mediaType: 'application/json',
      fileExtension: 'json',
    }
  },
}
const characterCardService = new CharacterCardCodecRegistry([jsonCodec])

function toImportedLorebookEntry(value: LorebookEntryInput): LorebookEntry {
  return LorebookEntry.create(
    [...value.keys],
    value.title,
    value.enabled ?? true,
    value.content,
    value.position,
    value.priority ?? 0,
    {
      secondaryKeys: value.secondaryKeys,
      matchMode: value.matchMode,
      constant: value.constant,
      caseSensitive: value.caseSensitive,
      matchWholeWords: value.matchWholeWords,
      probability: value.probability,
      insertionDepth: value.insertionDepth,
    },
  )
}

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
async function validateAssetReferences(
  runtime: ReturnType<typeof studioRuntime.requireActive>,
  references: readonly { assetId: string }[],
): Promise<void> {
  const uniqueIds = [
    ...new Set(references.map((reference) => reference.assetId)),
  ]
  const resolved = await Promise.all(
    uniqueIds.map((assetId) =>
      runtime.assetRepository.findById(new AssetId(assetId)),
    ),
  )
  if (resolved.some((asset) => asset === null))
    throw new Error('角色引用的资源不存在')
}

async function validateLorebookReferences(
  runtime: ReturnType<typeof studioRuntime.requireActive>,
  references: readonly { lorebookRevisionId: string }[],
): Promise<void> {
  const availableRevisions = new Map(
    (await runtime.lorebookRepository.findAll()).flatMap((book) =>
      book.revisions.map((revision) => [revision.id.value, revision] as const),
    ),
  )
  for (const reference of references) {
    const revision = availableRevisions.get(reference.lorebookRevisionId)
    if (!revision) throw new Error('引用的世界书版本不存在')
    if (revision.isDraft) throw new Error('角色只能引用已发布的世界书版本')
  }
}

function toAssets(
  values: readonly {
    assetId: string
    kind: CharacterRevisionAsset['kind']
    name: string
    uri: string
    ordinal: number
    extensions: Readonly<Record<string, unknown>>
  }[],
): CharacterRevisionAsset[] {
  return values.map(
    (value) =>
      new CharacterRevisionAsset({
        assetId: new AssetId(value.assetId),
        kind: value.kind,
        name: value.name,
        uri: value.uri,
        ordinal: value.ordinal,
        extensions: value.extensions,
      }),
  )
}

function toLorebookReferences(
  values: readonly {
    lorebookRevisionId: string
    ordinal: number
    enabled: boolean
  }[],
): CharacterLorebookReference[] {
  return values.map(
    (value) =>
      new CharacterLorebookReference({
        lorebookRevisionId: new LorebookRevisionId(value.lorebookRevisionId),
        ordinal: value.ordinal,
        enabled: value.enabled,
      }),
  )
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
      ownerId: new (await import('@kirika-js/core/domain/shared')).UserId(
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
    const runtime = studioRuntime.requireActive()
    const referenced = (await runtime.conversationRepository.findAll()).some(
      (conversation) =>
        conversation.participants.some(
          (participant) => participant.characterId?.value === input.characterId,
        ),
    )
    if (referenced) throw new Error('角色仍被会话引用，无法删除')
    await runtime.characterRepository.delete(new CharacterId(input.characterId))
  },
  async updateCharacterDraft(input) {
    const { runtime, character } = await load(input.characterId)
    character.updateDraftContent(draftId(character), input.patch)
    return save(runtime, character)
  },
  async saveCharacterDraft(input) {
    const { runtime, character } = await load(input.characterId)
    await Promise.all([
      validateAssetReferences(runtime, input.assets),
      validateLorebookReferences(runtime, input.lorebooks),
    ])
    const revisionId = draftId(character)
    character.changeAlias(input.alias)
    character.replaceDraftRevision(revisionId, {
      ...input.content,
      assets: toAssets(input.assets),
      lorebooks: toLorebookReferences(input.lorebooks),
    })
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
  async importCharacterAsset(input) {
    const result = await showOpenDialog({
      title: '添加角色资源',
      properties: ['openFile'],
    })
    const filePath = result.canceled ? null : result.filePaths[0]
    if (!filePath) return null
    const info = await stat(filePath)
    if (
      !info.isFile() ||
      info.size <= 0 ||
      info.size > MAX_EMBEDDED_ASSET_BYTES
    )
      throw new Error('角色资源文件必须小于 25 MB')
    const data = await readFile(filePath)
    const sha256 = createHash('sha256').update(data).digest('hex')
    const runtime = studioRuntime.requireActive()
    let asset = await runtime.assetRepository.findBySha256(sha256)
    if (!asset) {
      const extension = extname(filePath).replace(/^\./, '')
      const storageKey = `characters/assets/${randomUUID()}${extension ? `.${extension}` : ''}`
      await runtime.objectStorage.put({
        key: storageKey,
        data,
        contentType: 'application/octet-stream',
      })
      asset = Asset.create(
        storageKey,
        'application/octet-stream',
        data.byteLength,
        sha256,
      )
      try {
        await runtime.assetRepository.save(asset)
      } catch (error) {
        await runtime.objectStorage.delete(storageKey)
        throw error
      }
    }
    return {
      assetId: asset.id.value,
      kind: input.kind,
      name: basename(filePath),
      uri: `kirika-asset://${asset.storageKey}`,
      ordinal: 0,
      extensions: {},
    }
  },
  async replaceCharacterAssets(input) {
    const { runtime, character } = await load(input.characterId)
    await validateAssetReferences(runtime, input.assets)
    const assets = toAssets(input.assets)
    character.replaceDraftAssets(draftId(character), assets)
    return save(runtime, character)
  },
  async replaceCharacterLorebooks(input) {
    const { runtime, character } = await load(input.characterId)
    await validateLorebookReferences(runtime, input.lorebooks)
    const refs = toLorebookReferences(input.lorebooks)
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
    const result = await showOpenDialog({
      title: '导入角色卡',
      properties: ['openFile'],
      filters: [{ name: 'Character Card JSON', extensions: ['json'] }],
    })
    const filePath = result.canceled ? null : result.filePaths[0]
    if (!filePath) throw new Error('已取消导入角色卡')
    const info = await stat(filePath)
    if (
      !info.isFile() ||
      info.size <= 0 ||
      info.size > MAX_CHARACTER_CARD_BYTES
    )
      throw new Error('角色卡文件必须小于 10 MB')
    const imported = await characterCardService.importCard(
      {
        data: await readFile(filePath),
        mediaType: 'application/json',
        fileName: basename(filePath),
      },
      input.formatHint,
    )
    const runtime = studioRuntime.requireActive()
    const importedLorebooks: Lorebook[] = []
    const importedAssets: Asset[] = []
    const writtenAssetKeys: string[] = []
    let content: Awaited<ReturnType<typeof toCharacterRevisionContent>>
    try {
      content = await toCharacterRevisionContent(imported.card, {
        async importAsset(card) {
          if (!card.data)
            throw new Error(`角色卡资源“${card.name}”没有嵌入数据`)
          if (card.data.byteLength > MAX_EMBEDDED_ASSET_BYTES)
            throw new Error(`角色卡资源“${card.name}”超过 25 MB`)
          const sha256 = createHash('sha256').update(card.data).digest('hex')
          const existing = await runtime.assetRepository.findBySha256(sha256)
          if (existing)
            return {
              assetId: existing.id,
              uri: `kirika-asset://${existing.storageKey}`,
            }
          const extension = extname(card.uri ?? '').replace(/^\./, '')
          const storageKey = `characters/assets/${randomUUID()}${extension ? `.${extension}` : ''}`
          await runtime.objectStorage.put({
            key: storageKey,
            data: card.data,
            contentType: card.mediaType ?? 'application/octet-stream',
          })
          writtenAssetKeys.push(storageKey)
          const asset = Asset.create(
            storageKey,
            card.mediaType ?? 'application/octet-stream',
            card.data.byteLength,
            sha256,
          )
          importedAssets.push(asset)
          return { assetId: asset.id, uri: `kirika-asset://${storageKey}` }
        },
        async importLorebook(card) {
          const lorebook = Lorebook.create(
            card.name ?? `${imported.card.name} 世界书`,
            card.description ?? '',
            new (await import('@kirika-js/core/domain/shared')).UserId(
              runtime.settings.ownerId,
            ),
          )
          const draft = lorebook.draftRevision
          if (!draft) throw new Error('导入世界书未创建草稿')
          lorebook.replaceRevisionEntries(
            draft.id,
            card.entries.map(toImportedLorebookEntry),
          )
          lorebook.publishRevision(draft.id)
          importedLorebooks.push(lorebook)
          return draft.id
        },
      })
    } catch (error) {
      await Promise.allSettled(
        writtenAssetKeys.map((key) => runtime.objectStorage.delete(key)),
      )
      throw error
    }
    const character = Character.create({
      ownerId: new (await import('@kirika-js/core/domain/shared')).UserId(
        runtime.settings.ownerId,
      ),
      initialRevision: content,
    })
    try {
      for (const asset of importedAssets)
        await runtime.assetRepository.save(asset)
      for (const lorebook of importedLorebooks)
        await runtime.lorebookRepository.save(lorebook)
      return await save(runtime, character)
    } catch (error) {
      await Promise.allSettled([
        ...writtenAssetKeys.map((key) => runtime.objectStorage.delete(key)),
        ...importedAssets.map((asset) =>
          runtime.assetRepository.delete(asset.id),
        ),
        ...importedLorebooks.map((lorebook) =>
          runtime.lorebookRepository.delete(lorebook.id),
        ),
      ])
      throw error
    }
  },
  async exportCharacterCard(input) {
    const { character } = await load(input.characterId)
    const revision = input.revisionId
      ? character.findRevision(new CharacterRevisionId(input.revisionId))
      : (character.currentRevision ?? character.draftRevision)
    if (!revision) throw new Error('角色版本不存在')
    const lorebookRevisions = new Map(
      (
        await studioRuntime.requireActive().lorebookRepository.findAll()
      ).flatMap((book) =>
        book.revisions.map(
          (lorebookRevision) =>
            [lorebookRevision.id.value, { book, lorebookRevision }] as const,
        ),
      ),
    )
    const runtime = studioRuntime.requireActive()
    const document = await fromCharacterRevision(revision, {
      async exportAsset(reference) {
        const asset = await runtime.assetRepository.findById(reference.assetId)
        if (!asset?.storageKey) throw new Error('角色引用的资源不存在')
        return {
          data: await runtime.objectStorage.get(asset.storageKey),
          mediaType: asset.mediaType ?? undefined,
          uri: reference.uri,
        }
      },
      async exportLorebook(reference) {
        const found = lorebookRevisions.get(reference.lorebookRevisionId.value)
        if (!found) throw new Error('角色引用的世界书版本不存在')
        return {
          name: found.book.name,
          description: found.book.description,
          entries: found.lorebookRevision.entries.map((entry) => ({
            keys: entry.keys,
            secondaryKeys: entry.secondaryKeys,
            title: entry.title,
            enabled: entry.enabled,
            constant: entry.constant,
            content: entry.content,
            position: entry.position,
            insertionDepth: entry.insertionDepth,
            priority: entry.priority,
            matchMode: entry.matchMode,
            caseSensitive: entry.caseSensitive,
            matchWholeWords: entry.matchWholeWords,
            probability: entry.probability,
          })),
        }
      },
    })
    const encoded = await characterCardService.exportCard(
      createCharacterCardDocument(document),
      input.format,
    )
    const result = await showSaveDialog({
      title: '导出角色卡',
      defaultPath: `${revision.name}.json`,
      filters: [{ name: 'Character Card JSON', extensions: ['json'] }],
    })
    if (result.canceled || !result.filePath)
      return {
        cancelled: true,
        filePath: null,
        format: encoded.format,
        mediaType: encoded.mediaType,
      }
    await writeFile(result.filePath, encoded.data, { flag: 'wx' }).catch(
      async (error: NodeJS.ErrnoException) => {
        if (error.code !== 'EEXIST') throw error
        await writeFile(result.filePath as string, encoded.data)
      },
    )
    return {
      cancelled: false,
      filePath: result.filePath,
      format: encoded.format,
      mediaType: encoded.mediaType,
    }
  },
}
