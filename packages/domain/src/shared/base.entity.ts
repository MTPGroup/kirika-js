import type { EntityId } from './uuid-id.vo'

export abstract class Entity<TId extends EntityId> {
	protected constructor(protected readonly _id: TId) {}

	get id(): TId {
		return this._id
	}

	equals(other?: Entity<TId>): boolean {
		if (!other) return false
		if (this === other) return true

		return this.id.equals(other.id)
	}
}
