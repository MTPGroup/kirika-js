import type { ProviderApi, ProviderDto } from '../../shared/ipc'
import { providerChannels } from '../../shared/ipc'
import { invoke } from './invoke'

export const providerApi: ProviderApi = {
  listProviders: () => invoke<readonly ProviderDto[]>(providerChannels.list),
  saveProvider: (input) => invoke<ProviderDto>(providerChannels.save, input),
  deleteProvider: (input) => invoke<void>(providerChannels.delete, input),
}
