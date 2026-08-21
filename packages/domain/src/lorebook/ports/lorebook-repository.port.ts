import type { Lorebook, LorebookId } from '../entities/lorebook.entity'

export const LOREBOOK_REPOSITORY_PORT = Symbol('LOREBOOK_REPOSITORY_PORT')

export interface LorebookRepositoryPort {
	findById(id: LorebookId): Promise<Lorebook | null>
	save(lorebook: Lorebook): Promise<void>
	delete(id: LorebookId): Promise<void>
}
