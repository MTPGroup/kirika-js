import type { LorebookRevisionId } from '../../lorebook/entities/lorebook-revision.entity'

export interface CharacterLorebookReferenceProps {
  lorebookRevisionId: LorebookRevisionId
  ordinal: number
  enabled?: boolean
}

export class CharacterLorebookReference {
  readonly lorebookRevisionId: LorebookRevisionId
  readonly ordinal: number
  readonly enabled: boolean

  constructor(props: CharacterLorebookReferenceProps) {
    if (!Number.isInteger(props.ordinal) || props.ordinal < 0) {
      throw new Error('世界书引用序号必须是非负整数')
    }

    this.lorebookRevisionId = props.lorebookRevisionId
    this.ordinal = props.ordinal
    this.enabled = props.enabled ?? true
  }

  clone(): CharacterLorebookReference {
    return new CharacterLorebookReference({
      lorebookRevisionId: this.lorebookRevisionId,
      ordinal: this.ordinal,
      enabled: this.enabled,
    })
  }
}
