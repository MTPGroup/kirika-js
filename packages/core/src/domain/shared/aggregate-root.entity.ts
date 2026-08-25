import { Entity } from './base.entity'
import type { EntityId } from './uuid-id.vo'

export abstract class AggregateRoot<TId extends EntityId> extends Entity<TId> {}
