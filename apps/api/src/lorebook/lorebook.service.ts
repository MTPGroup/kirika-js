import type {
  LorebookEntry,
  LorebookId,
  LorebookRepositoryPort,
  LorebookVisibility,
} from '@kirika-js/core/domain/lorebook'
import { Lorebook } from '@kirika-js/core/domain/lorebook'
import type { UserId } from '@kirika-js/core/domain/shared'

export class LorebookService {
  constructor(private readonly repo: LorebookRepositoryPort) {}

  async create(
    name: string,
    description: string,
    ownerId: UserId,
  ): Promise<Lorebook> {
    const lorebook = Lorebook.create(name, description, ownerId)
    await this.repo.save(lorebook)
    return lorebook
  }

  async get(id: LorebookId): Promise<Lorebook | null> {
    return this.repo.findById(id)
  }

  async updateMetadata(
    lorebook: Lorebook,
    name: string,
    description: string,
  ): Promise<Lorebook> {
    lorebook.updateMetadata(name, description)
    await this.repo.save(lorebook)
    return lorebook
  }

  async changeVisibility(
    lorebook: Lorebook,
    visibility: LorebookVisibility,
  ): Promise<Lorebook> {
    lorebook.changeVisibility(visibility)
    await this.repo.save(lorebook)
    return lorebook
  }

  async replaceEntries(
    lorebook: Lorebook,
    entries: LorebookEntry[],
  ): Promise<Lorebook> {
    const draft = lorebook.draftRevision
    if (!draft) throw new Error('世界书没有草稿版本')
    lorebook.replaceRevisionEntries(draft.id, entries)
    await this.repo.save(lorebook)
    return lorebook
  }

  async updateSettings(
    lorebook: Lorebook,
    scanDepth: number,
    tokenBudget: number,
  ): Promise<Lorebook> {
    lorebook.updateDraftSettings(scanDepth, tokenBudget)
    await this.repo.save(lorebook)
    return lorebook
  }

  async publish(lorebook: Lorebook): Promise<Lorebook> {
    const draft = lorebook.draftRevision
    if (!draft) throw new Error('世界书没有草稿版本')
    lorebook.publishRevision(draft.id)
    await this.repo.save(lorebook)
    return lorebook
  }

  async remove(id: LorebookId): Promise<void> {
    await this.repo.delete(id)
  }
}
