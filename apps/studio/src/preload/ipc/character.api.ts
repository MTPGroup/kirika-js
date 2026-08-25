import type {
  CharacterApi,
  CharacterDto,
  CharacterRevisionAssetDto,
  CharacterSummaryDto,
  ExportCharacterCardResult,
} from '~/shared/ipc'
import { characterChannels } from './channel.constants'
import { invoke } from './invoke'

export const characterApi: CharacterApi = {
  listCharacters: () =>
    invoke<readonly CharacterSummaryDto[]>(characterChannels.list),
  createCharacter: (input) =>
    invoke<CharacterDto>(characterChannels.create, input),
  getCharacter: (input) =>
    invoke<CharacterDto | null>(characterChannels.get, input),
  deleteCharacter: (input) => invoke<void>(characterChannels.delete, input),
  updateCharacterDraft: (input) =>
    invoke<CharacterDto>(characterChannels.updateDraft, input),
  saveCharacterDraft: (input) =>
    invoke<CharacterDto>(characterChannels.saveDraft, input),
  replaceCharacterGreetings: (input) =>
    invoke<CharacterDto>(characterChannels.replaceGreetings, input),
  replaceCharacterExamples: (input) =>
    invoke<CharacterDto>(characterChannels.replaceExamples, input),
  importCharacterAsset: (input) =>
    invoke<CharacterRevisionAssetDto | null>(
      characterChannels.importAsset,
      input,
    ),
  replaceCharacterAssets: (input) =>
    invoke<CharacterDto>(characterChannels.replaceAssets, input),
  replaceCharacterLorebooks: (input) =>
    invoke<CharacterDto>(characterChannels.replaceLorebooks, input),
  createCharacterDraft: (input) =>
    invoke<CharacterDto>(characterChannels.createDraft, input),
  publishCharacterRevision: (input) =>
    invoke<CharacterDto>(characterChannels.publish, input),
  importCharacterCard: (input) =>
    invoke<CharacterDto>(characterChannels.importCard, input),
  exportCharacterCard: (input) =>
    invoke<ExportCharacterCardResult>(characterChannels.exportCard, input),
}
