import {
  Lorebook,
  LorebookEntry,
  LorebookEntryId,
  LorebookId,
  LorebookRevisionId,
} from '@kirika-js/domain/lorebook'
import { UserId } from '@kirika-js/domain/shared'
import type { LorebookApi, LorebookDto, LorebookEntryInput } from '~/shared/ipc'
import { toLorebookDto, toLorebookSummaryDto } from '../mappers/ipc-dto.mapper'
import { studioRuntime } from '../studio-runtime'

async function load(id: string) {
  const runtime = studioRuntime.requireActive()
  const lorebook = await runtime.lorebookRepository.findById(new LorebookId(id))
  if (!lorebook) throw new Error('世界书不存在')
  return { runtime, lorebook }
}
async function save(
  runtime: ReturnType<typeof studioRuntime.requireActive>,
  lorebook: Lorebook,
): Promise<LorebookDto> {
  await runtime.lorebookRepository.save(lorebook)
  return toLorebookDto(lorebook)
}
function entry(value: LorebookEntryInput) {
  const options = {
    secondaryKeys: value.secondaryKeys,
    matchMode: value.matchMode,
    constant: value.constant,
    caseSensitive: value.caseSensitive,
    matchWholeWords: value.matchWholeWords,
    probability: value.probability,
    insertionDepth: value.insertionDepth,
  }
  return value.id
    ? LorebookEntry.reconstitute(
        new LorebookEntryId(value.id),
        [...value.keys],
        value.title,
        value.enabled ?? true,
        value.content,
        value.position,
        value.priority ?? 0,
        options,
      )
    : LorebookEntry.create(
        [...value.keys],
        value.title,
        value.enabled ?? true,
        value.content,
        value.position,
        value.priority ?? 0,
        options,
      )
}

export const lorebookService: LorebookApi = {
  async listLorebooks() {
    return (await studioRuntime.requireActive().lorebookRepository.findAll())
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      .map(toLorebookSummaryDto)
  },
  async createLorebook(input) {
    const runtime = studioRuntime.requireActive()
    return save(
      runtime,
      Lorebook.create(
        input.name,
        input.description ?? '',
        new UserId(runtime.settings.ownerId),
      ),
    )
  },
  async getLorebook(input) {
    const value = await studioRuntime
      .requireActive()
      .lorebookRepository.findById(new LorebookId(input.lorebookId))
    return value ? toLorebookDto(value) : null
  },
  async deleteLorebook(input) {
    const runtime = studioRuntime.requireActive()
    const lorebook = await runtime.lorebookRepository.findById(
      new LorebookId(input.lorebookId),
    )
    if (!lorebook) return
    const revisionIds = new Set(
      lorebook.revisions.map((revision) => revision.id.value),
    )
    const referenced = (await runtime.characterRepository.findAll()).some(
      (character) =>
        character.revisions.some((revision) =>
          revision.lorebooks.some((reference) =>
            revisionIds.has(reference.lorebookRevisionId.value),
          ),
        ),
    )
    if (referenced) throw new Error('世界书仍被角色版本引用，无法删除')
    await runtime.lorebookRepository.delete(lorebook.id)
  },
  async updateLorebookMetadata(input) {
    const { runtime, lorebook } = await load(input.lorebookId)
    lorebook.updateMetadata(input.name, input.description)
    return save(runtime, lorebook)
  },
  async changeLorebookVisibility(input) {
    const { runtime, lorebook } = await load(input.lorebookId)
    lorebook.changeVisibility(input.visibility)
    return save(runtime, lorebook)
  },
  async createLorebookDraft(input) {
    const { runtime, lorebook } = await load(input.lorebookId)
    lorebook.createNewDraftRevision()
    return save(runtime, lorebook)
  },
  async replaceLorebookEntries(input) {
    const { runtime, lorebook } = await load(input.lorebookId)
    const revision = lorebook.draftRevision
    if (!revision) throw new Error('世界书不存在草稿版本')
    const draftEntryIds = new Set(revision.entries.map((item) => item.id.value))
    for (const item of input.entries) {
      if (item.id && !draftEntryIds.has(item.id))
        throw new Error('世界书条目不属于当前草稿版本')
    }
    lorebook.updateMetadata(input.name, input.description)
    lorebook.updateDraftSettings(input.scanDepth, input.tokenBudget)
    lorebook.replaceRevisionEntries(revision.id, input.entries.map(entry))
    if (lorebook.visibility !== input.visibility)
      lorebook.changeVisibility(input.visibility)
    return save(runtime, lorebook)
  },
  async publishLorebookRevision(input) {
    const { runtime, lorebook } = await load(input.lorebookId)
    lorebook.publishRevision(new LorebookRevisionId(input.revisionId))
    return save(runtime, lorebook)
  },
}
