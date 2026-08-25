import type { LorebookVisibility } from '@kirika-js/core/domain/lorebook'

export const LOREBOOK_LIST_READ_PORT = Symbol('LOREBOOK_LIST_READ_PORT')

export interface LorebookListItem {
  id: string
  ownerId: string
  name: string
  description: string
  currentRevisionId: string | null
  visibility: LorebookVisibility
  createdAt: Date
  updatedAt: Date
}

export interface FindMyLorebooksInput {
  ownerId: string
  offset: number
  limit: number
  visibility?: LorebookVisibility
}

export interface FindAvailableLorebooksInput {
  ownerId: string | null
  offset: number
  limit: number
}

export interface LorebookListReadPort {
  findMyLorebooks(input: FindMyLorebooksInput): Promise<{
    items: LorebookListItem[]
    total: number
  }>

  findAvailableLorebooks(input: FindAvailableLorebooksInput): Promise<{
    items: LorebookListItem[]
    total: number
  }>
}
