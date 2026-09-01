import type { LorebookApi, LorebookDto, LorebookSummaryDto } from '../../shared/ipc'
import { lorebookChannels } from './channel.constants'
import { invoke } from './invoke'

export const lorebookApi: LorebookApi = {
  listLorebooks: () => invoke<readonly LorebookSummaryDto[]>(lorebookChannels.list),
  createLorebook: (input) => invoke<LorebookDto>(lorebookChannels.create, input),
  getLorebook: (input) => invoke<LorebookDto | null>(lorebookChannels.get, input),
  deleteLorebook: (input) => invoke<void>(lorebookChannels.delete, input),
  updateLorebookMetadata: (input) => invoke<LorebookDto>(lorebookChannels.updateMetadata, input),
  changeLorebookVisibility: (input) =>
    invoke<LorebookDto>(lorebookChannels.changeVisibility, input),
  createLorebookDraft: (input) => invoke<LorebookDto>(lorebookChannels.createDraft, input),
  replaceLorebookEntries: (input) => invoke<LorebookDto>(lorebookChannels.replaceEntries, input),
  publishLorebookRevision: (input) => invoke<LorebookDto>(lorebookChannels.publish, input),
}
